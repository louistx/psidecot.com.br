namespace PsiDecot.Api.Domain.Entities;

public class Patient
{
    public Guid   Id              { get; set; } = Guid.NewGuid();
    public string UserId          { get; set; } = string.Empty;   // FK → psicóloga responsável

    // Identificação
    public string FullName        { get; set; } = string.Empty;
    public string Cpf             { get; set; } = string.Empty;   // armazenar masked/hashed via pgcrypto
    public DateOnly? DateOfBirth  { get; set; }
    public string Gender          { get; set; } = string.Empty;
    public string MaritalStatus   { get; set; } = string.Empty;

    // Contato
    public string Phone           { get; set; } = string.Empty;
    public string? Email          { get; set; }
    public string? Address        { get; set; }
    public string? EmergencyContact { get; set; }

    // Clínico
    public string ChiefComplaint  { get; set; } = string.Empty;
    public string? InternalNotes  { get; set; }
    public bool   IsActive        { get; set; } = true;

    // Auditoria
    public DateTimeOffset CreatedAt  { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt  { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? InactivatedAt { get; set; }

    // Navegação
    public ApplicationUser User     { get; set; } = null!;
    public ICollection<SessionRecord>  Sessions   { get; set; } = [];
    public ICollection<Medication>     Medications { get; set; } = [];
    public ICollection<PatientDocument> Documents { get; set; } = [];
}
