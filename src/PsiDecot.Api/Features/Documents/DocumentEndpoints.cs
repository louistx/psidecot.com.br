using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PsiDecot.Api.Common.Middleware;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;

namespace PsiDecot.Api.Features.Documents;

public static class DocumentEndpoints
{
    private static readonly HashSet<string> AllowedTypes =
    [
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    public static void Map(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/documents").WithTags("Documents").RequireAuthorization();

        // Patient docs
        g.MapPost  ("/patient/{patientId:guid}", UploadPatientDoc)
         .DisableAntiforgery();   // JWT auth — sem cookie CSRF aqui
        g.MapGet   ("/patient/{patientId:guid}", ListPatientDocs);
        g.MapGet   ("/{id:guid}/download",       Download);
        g.MapDelete("/{id:guid}",               DeleteDoc);

        // Session docs
        g.MapPost("/session/{sessionId:guid}", UploadSessionDoc)
         .DisableAntiforgery();
    }

    // ── POST /documents/patient/{patientId} ─────────────────────────────────────
    private static async Task<IResult> UploadPatientDoc(
        Guid patientId,
        IFormFile file,
        string? description,
        AppDbContext db,
        IConfiguration cfg,
        ClaimsPrincipal principal,
        AuditService audit,
        CancellationToken ct)
    {
        var userId = UserId(principal);

        if (!await db.Patients.AnyAsync(p => p.Id == patientId && p.UserId == userId, ct))
            return Results.NotFound();

        var validation = ValidateFile(file, cfg);
        if (validation is not null) return validation;

        var key  = await SaveFileAsync(file, cfg, ct);

        var doc = new PatientDocument
        {
            PatientId    = patientId,
            UserId       = userId,
            FileName     = file.FileName,
            StorageKey   = key,
            ContentType  = file.ContentType,
            FileSizeBytes = file.Length,
            Description  = description,
        };

        db.PatientDocuments.Add(doc);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Document.Uploaded", "PatientDocument", doc.Id.ToString(), null, doc, ct);

        return Results.Created($"/api/v1/documents/{doc.Id}/download",
            new { doc.Id, doc.FileName, doc.ContentType, doc.FileSizeBytes, doc.UploadedAt });
    }

    // ── POST /documents/session/{sessionId} ─────────────────────────────────────
    private static async Task<IResult> UploadSessionDoc(
        Guid sessionId,
        IFormFile file,
        AppDbContext db,
        IConfiguration cfg,
        ClaimsPrincipal principal,
        CancellationToken ct)
    {
        var userId = UserId(principal);

        if (!await db.Sessions.AnyAsync(s => s.Id == sessionId && s.UserId == userId, ct))
            return Results.NotFound();

        var validation = ValidateFile(file, cfg);
        if (validation is not null) return validation;

        var key = await SaveFileAsync(file, cfg, ct);

        var doc = new SessionDocument
        {
            SessionId     = sessionId,
            FileName      = file.FileName,
            StorageKey    = key,
            ContentType   = file.ContentType,
            FileSizeBytes = file.Length,
        };

        db.SessionDocuments.Add(doc);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/v1/documents/{doc.Id}/download",
            new { doc.Id, doc.FileName, doc.ContentType, doc.FileSizeBytes, doc.UploadedAt });
    }

    // ── GET /documents/patient/{patientId} ──────────────────────────────────────
    private static async Task<IResult> ListPatientDocs(
        Guid patientId, AppDbContext db, ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);
        if (!await db.Patients.AnyAsync(p => p.Id == patientId && p.UserId == userId, ct))
            return Results.NotFound();

        var docs = await db.PatientDocuments
            .Where(d => d.PatientId == patientId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new { d.Id, d.FileName, d.ContentType, d.FileSizeBytes, d.Description, d.UploadedAt })
            .ToListAsync(ct);

        return Results.Ok(docs);
    }

    // ── GET /documents/{id}/download ────────────────────────────────────────────
    private static async Task<IResult> Download(
        Guid id, AppDbContext db, IConfiguration cfg,
        ClaimsPrincipal principal, CancellationToken ct)
    {
        var userId = UserId(principal);

        // Busca em ambas as tabelas
        var pdoc = await db.PatientDocuments
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId, ct);

        if (pdoc is not null)
        {
            var bytes = await ReadFileAsync(pdoc.StorageKey, cfg);
            return bytes is null ? Results.NotFound() :
                Results.File(bytes, pdoc.ContentType, pdoc.FileName);
        }

        return Results.NotFound();
    }

    // ── DELETE /documents/{id} ───────────────────────────────────────────────────
    private static async Task<IResult> DeleteDoc(
        Guid id, AppDbContext db, IConfiguration cfg,
        ClaimsPrincipal principal, AuditService audit, CancellationToken ct)
    {
        var userId = UserId(principal);
        var doc    = await db.PatientDocuments
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId, ct);

        if (doc is null) return Results.NotFound();

        DeleteFile(doc.StorageKey, cfg);
        db.PatientDocuments.Remove(doc);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(userId, "Document.Deleted", "PatientDocument", id.ToString(), null, null, ct);

        return Results.NoContent();
    }

    // ── Storage helpers (local filesystem — trocar por S3/MinIO em produção) ────
    private static async Task<string> SaveFileAsync(IFormFile file, IConfiguration cfg, CancellationToken ct)
    {
        var basePath = cfg["Storage:LocalPath"] ?? "/var/psidecot/uploads";
        Directory.CreateDirectory(basePath);

        var ext = Path.GetExtension(file.FileName);
        var key = $"{Guid.NewGuid()}{ext}";
        var path = Path.Combine(basePath, key);

        await using var stream = File.Create(path);
        await file.CopyToAsync(stream, ct);
        return key;
    }

    private static async Task<byte[]?> ReadFileAsync(string key, IConfiguration cfg)
    {
        var basePath = cfg["Storage:LocalPath"] ?? "/var/psidecot/uploads";
        var path     = Path.Combine(basePath, key);
        return File.Exists(path) ? await File.ReadAllBytesAsync(path) : null;
    }

    private static void DeleteFile(string key, IConfiguration cfg)
    {
        var path = Path.Combine(cfg["Storage:LocalPath"] ?? "/var/psidecot/uploads", key);
        if (File.Exists(path)) File.Delete(path);
    }

    private static IResult? ValidateFile(IFormFile file, IConfiguration cfg)
    {
        var maxSize = cfg.GetValue<long>("Storage:MaxFileSizeBytes", 20_971_520); // 20MB
        if (file.Length > maxSize)
            return Results.BadRequest($"Arquivo excede o limite de {maxSize / 1_048_576}MB.");
        if (!AllowedTypes.Contains(file.ContentType))
            return Results.BadRequest("Tipo de arquivo não permitido.");
        return null;
    }

    private static string UserId(ClaimsPrincipal p) =>
        p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue("sub")!;
}
