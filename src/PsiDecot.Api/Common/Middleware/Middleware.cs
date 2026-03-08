using System.Text.Json;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;

namespace PsiDecot.Api.Common.Middleware;

// ── AuditService ────────────────────────────────────────────────────────────
public class AuditService(AppDbContext db, IHttpContextAccessor http)
{
    public async Task LogAsync(
        string userId, string action,
        string entityType, string entityId,
        object? oldValue, object? newValue,
        CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId     = userId,
            Action     = action,
            EntityType = entityType,
            EntityId   = entityId,
            OldValue   = oldValue is not null ? JsonSerializer.Serialize(oldValue) : null,
            NewValue   = newValue is not null ? JsonSerializer.Serialize(newValue) : null,
            IpAddress  = http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
    }
}

// ── ExceptionMiddleware ──────────────────────────────────────────────────────
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");

            ctx.Response.StatusCode  = 500;
            ctx.Response.ContentType = "application/json";

            var isDev = ctx.RequestServices
                .GetRequiredService<IWebHostEnvironment>()
                .IsDevelopment();

            await ctx.Response.WriteAsJsonAsync(new
            {
                error   = "Erro interno. Por favor tente novamente.",
                detail  = isDev ? ex.Message : null,
                traceId = ctx.TraceIdentifier,
            });
        }
    }
}
