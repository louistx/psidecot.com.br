using PsiDecot.Api.Domain.Entities;

namespace PsiDecot.Api.Features.Patients;

public record PatientSummaryDto(
    Guid        Id,
    string      FullName,
    string      Cpf,
    string      Phone,
    string?     Email,
    DateOnly?   DateOfBirth,
    bool        IsActive,
    DateTimeOffset CreatedAt,
    int         SessionCount);

public record PatientDetailDto(
    Guid        Id,
    string      FullName,
    string      Cpf,
    string      Phone,
    string?     Email,
    DateOnly?   DateOfBirth,
    string      Gender,
    string      MaritalStatus,
    string?     Address,
    string?     EmergencyContact,
    string      ChiefComplaint,
    string?     InternalNotes,
    bool        IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? InactivatedAt,
    List<SessionSummaryDto>  Sessions,
    List<MedicationDto>      Medications,
    List<DocumentDto>        Documents);

public record DashboardSessionDto(
    Guid         Id,
    Guid         PatientId,
    string       PatientName,
    DateOnly     SessionDate,
    TimeOnly?    SessionTime,
    int          SessionNumber,
    int          DurationMin,
    PatientMood? Mood);

public record CreatePatientRequest(
    string   FullName,
    string?  Cpf,
    string   Phone,
    string?  Email,
    DateOnly? DateOfBirth,
    string?  Gender,
    string?  MaritalStatus,
    string?  Address,
    string?  EmergencyContact,
    string   ChiefComplaint,
    string?  InternalNotes);

public record UpdatePatientRequest(
    string   FullName,
    string   Phone,
    string?  Email,
    DateOnly? DateOfBirth,
    string?  Gender,
    string?  MaritalStatus,
    string?  Address,
    string?  EmergencyContact,
    string   ChiefComplaint,
    string?  InternalNotes);

public record SessionSummaryDto(
    Guid         Id,
    DateOnly     SessionDate,
    int          SessionNumber,
    int          DurationMin,
    PatientMood? Mood,
    DateTimeOffset CreatedAt);

public record MedicationDto(
    Guid     Id,
    string   Name,
    string?  Dosage,
    string?  Frequency,
    string?  Prescriber,
    string?  Notes,
    bool     IsActive,
    DateOnly? StartDate,
    DateOnly? EndDate);

public record DocumentDto(
    Guid    Id,
    string  FileName,
    string  ContentType,
    long    FileSizeBytes,
    string? Description,
    DateTimeOffset UploadedAt);

public record PagedResult<T>(
    List<T> Items,
    int     Total,
    int     Page,
    int     PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
    public bool HasNext => Page < TotalPages;
    public bool HasPrev => Page > 1;
}
