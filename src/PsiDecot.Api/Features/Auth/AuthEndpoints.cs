using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;

namespace PsiDecot.Api.Features.Auth;

public static class AuthEndpoints
{
    public static void Map(RouteGroupBuilder api)
    {
        var group = api.MapGroup("/auth").WithTags("Auth");

        group.MapPost("/login",   Login)  .AllowAnonymous();
        group.MapPost("/refresh", Refresh).AllowAnonymous();
        group.MapPost("/logout",  Logout) .RequireAuthorization();
        group.MapGet ("/me",      Me)     .RequireAuthorization();
        group.MapPost("/change-password", ChangePassword).RequireAuthorization();
    }

    // ── POST /auth/login ────────────────────────────────────────────────────────
    private static async Task<IResult> Login(
        LoginRequest req,
        UserManager<ApplicationUser>  userMgr,
        SignInManager<ApplicationUser> signIn,
        TokenService tokens,
        HttpContext ctx,
        CancellationToken ct)
    {
        var user = await userMgr.FindByEmailAsync(req.Email);
        if (user is null || !user.IsActive)
            return Results.Unauthorized();

        var result = await signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return Results.Problem("Conta bloqueada temporariamente.", statusCode: 429);

        if (!result.Succeeded)
            return Results.Unauthorized();

        var accessToken  = tokens.GenerateAccessToken(user);
        var refreshToken = await tokens.GenerateRefreshTokenAsync(
            user, ctx.Request.Headers.UserAgent.ToString(), ct);

        // Refresh token no httpOnly cookie (mais seguro que localStorage)
        var isDev = ctx.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        ctx.Response.Cookies.Append("refresh_token", refreshToken.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = !isDev,
            SameSite = isDev ? SameSiteMode.Lax : SameSiteMode.Strict,
            Expires  = refreshToken.ExpiresAt,
        });

        return Results.Ok(new TokenResponse(
            accessToken,
            refreshToken.ExpiresAt,
            new UserDto(user.Id, user.FullName, user.Email!, user.Crp, user.Specialty)));
    }

    // ── POST /auth/refresh ──────────────────────────────────────────────────────
    private static async Task<IResult> Refresh(
        AppDbContext db,
        UserManager<ApplicationUser> userMgr,
        TokenService tokens,
        HttpContext ctx,
        CancellationToken ct)
    {
        var cookieToken = ctx.Request.Cookies["refresh_token"];
        if (string.IsNullOrEmpty(cookieToken))
            return Results.Unauthorized();

        var rt = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == cookieToken, ct);

        if (rt is null || !rt.IsValid)
            return Results.Unauthorized();

        // Rotate refresh token
        rt.IsRevoked = true;
        var newRt = await tokens.GenerateRefreshTokenAsync(
            rt.User, ctx.Request.Headers.UserAgent.ToString(), ct);

        var isDev = ctx.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        ctx.Response.Cookies.Append("refresh_token", newRt.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = !isDev,
            SameSite = isDev ? SameSiteMode.Lax : SameSiteMode.Strict,
            Expires  = newRt.ExpiresAt,
        });

        return Results.Ok(new TokenResponse(
            tokens.GenerateAccessToken(rt.User),
            newRt.ExpiresAt,
            new UserDto(rt.User.Id, rt.User.FullName, rt.User.Email!, rt.User.Crp, rt.User.Specialty)));
    }

    // ── POST /auth/logout ───────────────────────────────────────────────────────
    private static async Task<IResult> Logout(
        ClaimsPrincipal principal,
        AppDbContext db,
        TokenService tokens,
        HttpContext ctx,
        CancellationToken ct)
    {
        var cookieToken = ctx.Request.Cookies["refresh_token"];
        if (!string.IsNullOrEmpty(cookieToken))
            await tokens.RevokeRefreshTokenAsync(cookieToken, ct);

        ctx.Response.Cookies.Delete("refresh_token");
        return Results.NoContent();
    }

    // ── GET /auth/me ────────────────────────────────────────────────────────────
    private static async Task<IResult> Me(
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userMgr)
    {
        var user = await userMgr.FindByIdAsync(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Results.Unauthorized();
        return Results.Ok(new UserDto(user.Id, user.FullName, user.Email!, user.Crp, user.Specialty));
    }

    // ── POST /auth/change-password ────────────────────────────────────────────
    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest req,
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userMgr)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();

        var user = await userMgr.FindByIdAsync(userId);
        if (user is null) return Results.Unauthorized();

        var result = await userMgr.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
        if (!result.Succeeded)
            return Results.BadRequest(new { errors = result.Errors.Select(e => e.Description).ToArray() });

        return Results.Ok(new { message = "Senha atualizada com sucesso" });
    }
}

// ── DTOs ───────────────────────────────────────────────────────────────────────
public record LoginRequest(string Email, string Password);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record TokenResponse(
    string AccessToken,
    DateTimeOffset RefreshTokenExpiry,
    UserDto User);

public record UserDto(
    string Id,
    string FullName,
    string Email,
    string Crp,
    string Specialty);
