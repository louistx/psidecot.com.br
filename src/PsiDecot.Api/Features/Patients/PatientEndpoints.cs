using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PsiDecot.Api.Common.Middleware;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;

namespace PsiDecot.Api.Features.Patients;

public static class PatientEndpoints
{
    public static void Map(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/patients")
                   .WithTags("Patients")
                   .RequireAuthorization();

        g.MapGet   ("/",           List);
        g.MapGet   ("/{id:guid}", GetById);
        g.MapPost  ("/",           Create);
        g.MapPut   ("/{id:guid}", Update);
        g.MapPatch ("/{id:guid}/toggle-active", ToggleActive);
        g.MapDelete("/{id:guid}", Delete);
    }

    // ── GET /patients?search=&active= ──────────────────────────────────────────
    private static async Task<IResult> List(
        AppDbContext db,
        ClaimsPrincipal principal,
        string? search = null,
        bool? active   = null,
        int page       = 1,
        int pageSize   = 30,
        CancellationToken ct = default)
    {
        var userId = UserId(principal);
        var q = db.Patients.Where(p => p.UserId == userId);

        if (active.HasValue) q = q.Where(p => p.IsActive == active.Value);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(p => EF.Functions.ILike(p.FullName, $"%{search}%")
                           || p.Cpf.Contains(search));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(p => p.FullName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => ToSummaryDto(p))
            .ToListAsync(ct);

        return Results.Ok(new PagedResult<PatientSummaryDto>(items, total, page, pageSize));
    }

    // ── GET /patients/{id} ──────────────────────────────────────────────────────
    private static async Task<IResult> GetById(
        Guid id, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        var p = await db.Patients
            .Include(p => p.Sessions.OrderByDescending(s => s.SessionDate))
            .Include(p => p.Medications.Where(m => m.IsActive))
            .Include(p => p.Documents.OrderByDescending(d => d.UploadedAt))
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == UserId(principal), ct);

        return p is null ? Results.NotFound() : Results.Ok(ToDetailDto(p));
    }

    // ── POST /patients ──────────────────────────────────────────────────────────
    private static async Task<IResult> Create(
        CreatePatientRequest req,
        AppDbContext db,
        ClaimsPrincipal principal,
        AuditService audit,
        CancellationToken ct)
    {
        var userId = UserId(principal);

        if (!string.IsNullOrWhiteSpace(req.Cpf) &&
            await db.Patients.AnyAsync(p => p.UserId == userId && p.Cpf == req.Cpf, ct))
            return Results.Conflict("CPF já cadastrado.");

        var patient = new Patient
        {
            UserId           = userId,
            FullName         = req.FullName,
            Cpf              = req.Cpf ?? string.Empty,
            DateOfBirth      = req.DateOfBirth,
            Gender           = req.Gender ?? string.Empty,
            MaritalStatus    = req.MaritalStatus ?? string.Empty,
            Phone            = req.Phone,
            Email            = req.Email,
            Address          = req.Address,
            EmergencyContact = req.EmergencyContact,
            ChiefComplaint   = req.ChiefComplaint,
            InternalNotes    = req.InternalNotes,
        };

        db.Patients.Add(patient);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Patient.Created", "Patient", patient.Id.ToString(), null, patient, ct);

        return Results.Created($"/api/v1/patients/{patient.Id}", ToSummaryDto(patient));
    }

    // ── PUT /patients/{id} ──────────────────────────────────────────────────────
    private static async Task<IResult> Update(
        Guid id,
        UpdatePatientRequest req,
        AppDbContext db,
        ClaimsPrincipal principal,
        AuditService audit,
        CancellationToken ct)
    {
        var userId  = UserId(principal);
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, ct);
        if (patient is null) return Results.NotFound();

        var before = System.Text.Json.JsonSerializer.Serialize(patient);

        patient.FullName         = req.FullName;
        patient.Phone            = req.Phone;
        patient.Email            = req.Email;
        patient.Address          = req.Address;
        patient.EmergencyContact = req.EmergencyContact;
        patient.ChiefComplaint   = req.ChiefComplaint;
        patient.InternalNotes    = req.InternalNotes;
        patient.Gender           = req.Gender ?? string.Empty;
        patient.MaritalStatus    = req.MaritalStatus ?? string.Empty;
        patient.DateOfBirth      = req.DateOfBirth;

        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Patient.Updated", "Patient", id.ToString(), before, patient, ct);

        return Results.Ok(ToSummaryDto(patient));
    }

    // ── PATCH /patients/{id}/toggle-active ──────────────────────────────────────
    private static async Task<IResult> ToggleActive(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal,
        AuditService audit,
        CancellationToken ct)
    {
        var userId  = UserId(principal);
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, ct);
        if (patient is null) return Results.NotFound();

        patient.IsActive       = !patient.IsActive;
        patient.InactivatedAt  = patient.IsActive ? null : DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId,
            patient.IsActive ? "Patient.Reactivated" : "Patient.Inactivated",
            "Patient", id.ToString(), null, null, ct);

        return Results.Ok(new { patient.Id, patient.IsActive });
    }

    // ── DELETE /patients/{id} (soft — só inativa) ───────────────────────────────
    private static async Task<IResult> Delete(
        Guid id, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        // Hard delete não exposto — por compliance LGPD use processo formal
        return Results.StatusCode(405);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────
    private static string UserId(ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? p.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException();

    private static PatientSummaryDto ToSummaryDto(Patient p) => new(
        p.Id, p.FullName, p.Cpf, p.Phone, p.Email,
        p.DateOfBirth, p.IsActive,
        p.CreatedAt, p.Sessions.Count);

    private static PatientDetailDto ToDetailDto(Patient p) => new(
        p.Id, p.FullName, p.Cpf, p.Phone, p.Email,
        p.DateOfBirth, p.Gender, p.MaritalStatus,
        p.Address, p.EmergencyContact,
        p.ChiefComplaint, p.InternalNotes,
        p.IsActive, p.CreatedAt, p.InactivatedAt,
        p.Sessions.Select(s => new SessionSummaryDto(
            s.Id, s.SessionDate, s.SessionNumber, s.DurationMin, s.Mood, s.CreatedAt)).ToList(),
        p.Medications.Select(m => new MedicationDto(
            m.Id, m.Name, m.Dosage, m.Frequency, m.Prescriber, m.Notes, m.IsActive, m.StartDate, m.EndDate)).ToList(),
        p.Documents.Select(d => new DocumentDto(
            d.Id, d.FileName, d.ContentType, d.FileSizeBytes, d.Description, d.UploadedAt)).ToList());
}
