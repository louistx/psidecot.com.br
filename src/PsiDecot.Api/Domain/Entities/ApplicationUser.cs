using Microsoft.AspNetCore.Identity;

namespace PsiDecot.Api.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName    { get; set; } = string.Empty;
    public string Crp         { get; set; } = string.Empty;   // Ex: 06/123456
    public string Specialty   { get; set; } = string.Empty;
    public bool   IsActive    { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Refresh tokens (1:N — um user pode ter sessão em vários dispositivos)
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}

public class RefreshToken
{
    public Guid   Id          { get; set; } = Guid.NewGuid();
    public string UserId      { get; set; } = string.Empty;
    public string Token       { get; set; } = string.Empty;
    public string DeviceHint  { get; set; } = string.Empty;   // "iPhone / Safari"
    public bool   IsRevoked   { get; set; } = false;
    public DateTimeOffset ExpiresAt  { get; set; }
    public DateTimeOffset CreatedAt  { get; set; } = DateTimeOffset.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public bool IsExpired  => DateTimeOffset.UtcNow >= ExpiresAt;
    public bool IsValid    => !IsRevoked && !IsExpired;
}
