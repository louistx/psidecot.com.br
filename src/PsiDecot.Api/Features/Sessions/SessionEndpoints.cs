using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PsiDecot.Api.Common.Middleware;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;
using PsiDecot.Api.Features.Patients;

namespace PsiDecot.Api.Features.Sessions;

public static class SessionEndpoints
{
    public static void Map(RouteGroupBuilder api)
    {
        // ── Sessions ──────────────────────────────────────────────────────────────
        var s = api.MapGroup("/sessions").WithTags("Sessions").RequireAuthorization();
        s.MapGet("/", ListAll);
        s.MapGet("/patient/{patientId:guid}", ListByPatient);
        s.MapGet("/{id:guid}", GetById);
        s.MapPost("/", Create);
        s.MapPut("/{id:guid}", Update);
        s.MapDelete("/{id:guid}", Delete);

        // ── Medications ───────────────────────────────────────────────────────────
        var m = api.MapGroup("/medications").WithTags("Medications").RequireAuthorization();
        m.MapGet("/patient/{patientId:guid}", ListMedsByPatient);
        m.MapPost("/", CreateMedication);
        m.MapPut("/{id:guid}", UpdateMedication);
        m.MapPatch("/{id:guid}/toggle-active", ToggleMedication);
    }

    // ── GET /sessions?date=&upcoming= ───────────────────────────────────────────
    private static async Task<IResult> ListAll(
        AppDbContext db, ClaimsPrincipal principal,
        DateOnly? date = null, bool upcoming = false,
        int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var userId = UserId(principal);
        var today  = DateOnly.FromDateTime(DateTime.Today);

        var q = db.Sessions
            .Include(s => s.Patient)
            .Where(s => s.UserId == userId);

        if (date.HasValue)
            q = q.Where(s => s.SessionDate == date.Value);
        else if (upcoming)
            q = q.Where(s => s.SessionDate >= today);

        IQueryable<SessionRecord> ordered = (date.HasValue || upcoming)
            ? q.OrderBy(s => s.SessionDate).ThenBy(s => s.SessionTime)
            : q.OrderByDescending(s => s.SessionDate);

        var total = await ordered.CountAsync(ct);
        var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Results.Ok(new PagedResult<DashboardSessionDto>(
            items.Select(s => new DashboardSessionDto(
                s.Id, s.PatientId, s.Patient!.FullName,
                s.SessionDate, s.SessionTime, s.SessionNumber,
                s.DurationMin, s.Mood)).ToList(),
            total, page, pageSize));
    }

    // ── GET /sessions/patient/{patientId} ───────────────────────────────────────
    private static async Task<IResult> ListByPatient(
        Guid patientId, AppDbContext db, ClaimsPrincipal principal,
        int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var userId = UserId(principal);

        // Valida que o paciente pertence ao usuário
        if (!await db.Patients.AnyAsync(p => p.Id == patientId && p.UserId == userId, ct))
            return Results.NotFound();

        var q = db.Sessions
            .Where(s => s.PatientId == patientId)
            .Include(s => s.Documents)
            .OrderByDescending(s => s.SessionDate);

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Results.Ok(new PagedResult<SessionDetailDto>(
            items.Select(s => ToDto(s)).ToList(), total, page, pageSize));
    }

    // ── GET /sessions/{id} ──────────────────────────────────────────────────────
    private static async Task<IResult> GetById(
        Guid id, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);
        var session = await db.Sessions
            .Include(s => s.Documents)
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

        return session is null ? Results.NotFound() : Results.Ok(ToDto(session));
    }

    // ── POST /sessions ──────────────────────────────────────────────────────────
    private static async Task<IResult> Create(
        CreateSessionRequest req,
        AppDbContext db,
        ClaimsPrincipal principal,
        AuditService audit,
        CancellationToken ct)
    {
        var userId = UserId(principal);

        if (!await db.Patients.AnyAsync(p => p.Id == req.PatientId && p.UserId == userId, ct))
            return Results.NotFound("Paciente não encontrado.");

        // Calcula número da sessão
        var count = await db.Sessions.CountAsync(s => s.PatientId == req.PatientId, ct);

        var session = new SessionRecord
        {
            UserId = userId,
            PatientId = req.PatientId,
            SessionDate = req.SessionDate,
            SessionTime = req.SessionTime,
            DurationMin = req.DurationMin,
            SessionNumber = count + 1,
            Notes = req.Notes,
            Plan = req.Plan,
            Mood = req.Mood,
        };

        db.Sessions.Add(session);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Session.Created", "SessionRecord", session.Id.ToString(), null, session, ct);

        return Results.Created($"/api/v1/sessions/{session.Id}", ToDto(session));
    }

    // ── PUT /sessions/{id} ──────────────────────────────────────────────────────
    private static async Task<IResult> Update(
        Guid id, UpdateSessionRequest req,
        AppDbContext db, ClaimsPrincipal principal,
        AuditService audit, CancellationToken ct)
    {
        var userId = UserId(principal);
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (session is null) return Results.NotFound();

        session.SessionDate = req.SessionDate;
        session.DurationMin = req.DurationMin;
        session.Notes = req.Notes;
        session.Plan = req.Plan;
        session.Mood = req.Mood;

        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Session.Updated", "SessionRecord", id.ToString(), null, null, ct);

        return Results.Ok(ToDto(session));
    }

    // ── DELETE /sessions/{id} ───────────────────────────────────────────────────
    private static async Task<IResult> Delete(
        Guid id, AppDbContext db, ClaimsPrincipal principal,
        AuditService audit, CancellationToken ct)
    {
        var userId = UserId(principal);
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (session is null) return Results.NotFound();

        db.Sessions.Remove(session);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Session.Deleted", "SessionRecord", id.ToString(), null, null, ct);

        return Results.NoContent();
    }

    // ── Medication handlers ──────────────────────────────────────────────────────
    private static async Task<IResult> ListMedsByPatient(
        Guid patientId, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);
        if (!await db.Patients.AnyAsync(p => p.Id == patientId && p.UserId == userId, ct))
            return Results.NotFound();

        var meds = await db.Medications
            .Where(m => m.PatientId == patientId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);

        return Results.Ok(meds.Select(m => new MedicationDto(
            m.Id, m.Name, m.Dosage, m.Frequency, m.Prescriber,
            m.Notes, m.IsActive, m.StartDate, m.EndDate)));
    }

    private static async Task<IResult> CreateMedication(
        CreateMedicationRequest req, AppDbContext db,
        ClaimsPrincipal principal, AuditService audit, CancellationToken ct)
    {
        var userId = UserId(principal);
        if (!await db.Patients.AnyAsync(p => p.Id == req.PatientId && p.UserId == userId, ct))
            return Results.NotFound();

        var med = new Medication
        {
            PatientId = req.PatientId,
            UserId = userId,
            Name = req.Name,
            Dosage = req.Dosage,
            Frequency = req.Frequency,
            Prescriber = req.Prescriber,
            Notes = req.Notes,
            StartDate = req.StartDate,
        };

        db.Medications.Add(med);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Medication.Created", "Medication", med.Id.ToString(), null, med, ct);

        return Results.Created($"/api/v1/medications/{med.Id}",
            new MedicationDto(med.Id, med.Name, med.Dosage, med.Frequency,
                              med.Prescriber, med.Notes, med.IsActive, med.StartDate, med.EndDate));
    }

    private static async Task<IResult> UpdateMedication(
        Guid id, UpdateMedicationRequest req, AppDbContext db,
        ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);
        var med = await db.Medications.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (med is null) return Results.NotFound();

        med.Name = req.Name; med.Dosage = req.Dosage; med.Frequency = req.Frequency;
        med.Prescriber = req.Prescriber; med.Notes = req.Notes;
        med.StartDate = req.StartDate; med.EndDate = req.EndDate;

        await db.SaveChangesAsync(ct);
        return Results.Ok(new MedicationDto(med.Id, med.Name, med.Dosage, med.Frequency,
                                            med.Prescriber, med.Notes, med.IsActive, med.StartDate, med.EndDate));
    }

    private static async Task<IResult> ToggleMedication(
        Guid id, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);
        var med = await db.Medications.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (med is null) return Results.NotFound();

        med.IsActive = !med.IsActive;
        med.EndDate = med.IsActive ? null : DateOnly.FromDateTime(DateTime.Today);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { med.Id, med.IsActive });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    private static string UserId(ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue("sub")!;

    private static SessionDetailDto ToDto(SessionRecord s) => new(
        s.Id, s.PatientId, s.SessionDate, s.SessionTime,
        s.SessionNumber, s.DurationMin, s.Notes, s.Plan, s.Mood,
        s.CreatedAt, s.UpdatedAt,
        s.Documents.Select(d => new SessionDocDto(
            d.Id, d.FileName, d.ContentType, d.FileSizeBytes, d.UploadedAt)).ToList());
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public record SessionDetailDto(
    Guid Id,
    Guid PatientId,
    DateOnly SessionDate,
    TimeOnly? SessionTime,
    int SessionNumber,
    int DurationMin,
    string Notes,
    string? Plan,
    PatientMood? Mood,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<SessionDocDto> Documents);

public record SessionDocDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    DateTimeOffset UploadedAt);

public record CreateSessionRequest(
    Guid PatientId,
    DateOnly SessionDate,
    TimeOnly? SessionTime,
    int DurationMin,
    string Notes,
    string? Plan,
    PatientMood? Mood);

public record UpdateSessionRequest(
    DateOnly SessionDate,
    int DurationMin,
    string Notes,
    string? Plan,
    PatientMood? Mood);

public record CreateMedicationRequest(
    Guid PatientId,
    string Name,
    string? Dosage,
    string? Frequency,
    string? Prescriber,
    string? Notes,
    DateOnly? StartDate);

// DashboardSessionDto lives in PatientDtos.cs (shared namespace)

public record UpdateMedicationRequest(
    string Name,
    string? Dosage,
    string? Frequency,
    string? Prescriber,
    string? Notes,
    DateOnly? StartDate,
    DateOnly? EndDate);
