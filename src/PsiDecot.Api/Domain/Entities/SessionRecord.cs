namespace PsiDecot.Api.Domain.Entities;

/// <summary>
/// Registro de uma sessão terapêutica — texto livre + humor + plano.
/// </summary>
public class SessionRecord
{
    public Guid      Id            { get; set; } = Guid.NewGuid();
    public Guid      PatientId     { get; set; }
    public string    UserId        { get; set; } = string.Empty;

    public DateOnly  SessionDate   { get; set; }
    public TimeOnly? SessionTime   { get; set; }
    public int       DurationMin   { get; set; } = 50;
    public int       SessionNumber { get; set; }      // calculado no backend

    // Conteúdo clínico
    public string    Notes         { get; set; } = string.Empty;   // relato livre
    public string?   Plan          { get; set; }                   // tarefas / plano
    public PatientMood? Mood       { get; set; }

    public DateTimeOffset CreatedAt  { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt  { get; set; } = DateTimeOffset.UtcNow;

    public Patient          Patient   { get; set; } = null!;
    public ApplicationUser  User      { get; set; } = null!;
    public ICollection<SessionDocument> Documents { get; set; } = [];
}

public enum PatientMood
{
    VeryAnxious = 1,
    Anxious     = 2,
    Neutral     = 3,
    Good        = 4,
    VeryGood    = 5
}

// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Documento anexado a um paciente (laudos, autorizações, escalas).
/// O arquivo físico fica em storage local/S3 — aqui só o metadata.
/// </summary>
public class PatientDocument
{
    public Guid   Id           { get; set; } = Guid.NewGuid();
    public Guid   PatientId    { get; set; }
    public string UserId       { get; set; } = string.Empty;

    public string FileName     { get; set; } = string.Empty;   // nome original
    public string StorageKey   { get; set; } = string.Empty;   // path/key no storage
    public string ContentType  { get; set; } = string.Empty;
    public long   FileSizeBytes { get; set; }
    public string? Description { get; set; }

    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient          Patient { get; set; } = null!;
    public ApplicationUser  User    { get; set; } = null!;
}

/// <summary>
/// Documento anexado a uma sessão específica.
/// </summary>
public class SessionDocument
{
    public Guid   Id            { get; set; } = Guid.NewGuid();
    public Guid   SessionId     { get; set; }
    public string FileName      { get; set; } = string.Empty;
    public string StorageKey    { get; set; } = string.Empty;
    public string ContentType   { get; set; } = string.Empty;
    public long   FileSizeBytes { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public SessionRecord Session { get; set; } = null!;
}

// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Histórico de medicamentos do paciente (informativo — não é prescrição).
/// </summary>
public class Medication
{
    public Guid    Id          { get; set; } = Guid.NewGuid();
    public Guid    PatientId   { get; set; }
    public string  UserId      { get; set; } = string.Empty;

    public string  Name        { get; set; } = string.Empty;   // ex: Sertralina
    public string? Dosage      { get; set; }                   // ex: 50mg
    public string? Frequency   { get; set; }                   // ex: 1x/dia
    public string? Prescriber  { get; set; }                   // psiquiatra responsável
    public string? Notes       { get; set; }
    public bool    IsActive    { get; set; } = true;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate   { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Patient         Patient { get; set; } = null!;
    public ApplicationUser User    { get; set; } = null!;
}

// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Log de auditoria imutável — quem fez o quê, quando.
/// </summary>
public class AuditLog
{
    public long   Id         { get; set; }
    public string UserId     { get; set; } = string.Empty;
    public string Action     { get; set; } = string.Empty;   // "Patient.Created", "Session.Updated" …
    public string EntityType { get; set; } = string.Empty;
    public string EntityId   { get; set; } = string.Empty;
    public string? OldValue  { get; set; }   // JSON snapshot anterior
    public string? NewValue  { get; set; }   // JSON snapshot novo
    public string? IpAddress { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}
