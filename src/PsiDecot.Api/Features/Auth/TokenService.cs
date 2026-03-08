using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;

namespace PsiDecot.Api.Features.Auth;

public class TokenService(IConfiguration cfg, AppDbContext db)
{
    private readonly string _key      = cfg["Jwt:Key"]!;
    private readonly string _issuer   = cfg["Jwt:Issuer"]!;
    private readonly string _audience = cfg["Jwt:Audience"]!;
    private readonly int    _accessExpiry  = cfg.GetValue<int>("Jwt:AccessTokenExpiryMinutes",  15);
    private readonly int    _refreshExpiry = cfg.GetValue<int>("Jwt:RefreshTokenExpiryDays",     7);

    public string GenerateAccessToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new("name", user.FullName),
            new("crp",  user.Crp),
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(_accessExpiry),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<RefreshToken> GenerateRefreshTokenAsync(
        ApplicationUser user, string deviceHint, CancellationToken ct = default)
    {
        var token = new RefreshToken
        {
            UserId     = user.Id,
            Token      = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            DeviceHint = deviceHint,
            ExpiresAt  = DateTimeOffset.UtcNow.AddDays(_refreshExpiry),
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync(ct);
        return token;
    }

    public async Task RevokeRefreshTokenAsync(string token, CancellationToken ct = default)
    {
        var rt = await db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token, ct);
        if (rt is not null) { rt.IsRevoked = true; await db.SaveChangesAsync(ct); }
    }

    /// <summary>Revoga todos os refresh tokens do usuário (logout all devices).</summary>
    public async Task RevokeAllAsync(string userId, CancellationToken ct = default)
    {
        var tokens = db.RefreshTokens.Where(t => t.UserId == userId && !t.IsRevoked);
        await tokens.ExecuteUpdateAsync(s => s.SetProperty(t => t.IsRevoked, true), ct);
    }
}
