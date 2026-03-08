using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using PsiDecot.Api.Domain.Entities;
using PsiDecot.Api.Infrastructure.Data;
using PsiDecot.Api.Features.Auth;
using PsiDecot.Api.Features.Patients;
using PsiDecot.Api.Features.Sessions;
using PsiDecot.Api.Features.Documents;
using PsiDecot.Api.Common.Middleware;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// ── OpenTelemetry ─────────────────────────────────────────────────────────────
// Aponte OpenTelemetry:Endpoint (ou env OTEL_EXPORTER_OTLP_ENDPOINT) para um
// coletor OTLP e traces, métricas e logs fluem automaticamente.
var otelEndpoint = builder.Configuration["OpenTelemetry:Endpoint"]
                ?? Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT");

var hasCollector = !string.IsNullOrEmpty(otelEndpoint);

var resourceBuilder = ResourceBuilder.CreateDefault()
    .AddService(
        serviceName: Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME") ?? "PsiDecot.Api",
        serviceVersion: "1.0.0",
        serviceInstanceId: Environment.MachineName);

builder.Services
    .AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetResourceBuilder(resourceBuilder)
            .AddAspNetCoreInstrumentation(opt =>
            {
                opt.RecordException = true;
                opt.Filter = ctx => ctx.Request.Path != "/healthz";
            })
            .AddHttpClientInstrumentation()
            .AddEntityFrameworkCoreInstrumentation(opt =>
            {
                opt.SetDbStatementForText = builder.Environment.IsDevelopment();
            })
            .AddNpgsql();

        if (hasCollector)
            tracing.AddOtlpExporter(opt => opt.Endpoint = new Uri(otelEndpoint!));
        else if (builder.Environment.IsDevelopment())
            tracing.AddConsoleExporter();
    })
    .WithMetrics(metrics =>
    {
        metrics
            .SetResourceBuilder(resourceBuilder)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation();

        if (hasCollector)
            metrics.AddOtlpExporter(opt => opt.Endpoint = new Uri(otelEndpoint!));
        else if (builder.Environment.IsDevelopment())
            metrics.AddConsoleExporter();
    })
    .WithLogging(logging =>
    {
        logging.SetResourceBuilder(resourceBuilder);

        if (hasCollector)
            logging.AddOtlpExporter(opt => opt.Endpoint = new Uri(otelEndpoint!));
        else if (builder.Environment.IsDevelopment())
            logging.AddConsoleExporter();
    });

builder.Logging.AddConsole();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"),
        npg => npg.MigrationsHistoryTable("__ef_migrations", "psidecot")));

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(opt =>
    {
        opt.Password.RequiredLength = 10;
        opt.Password.RequireNonAlphanumeric = true;
        opt.Lockout.MaxFailedAccessAttempts = 5;
        opt.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]
    ?? throw new InvalidOperationException("JWT Key not configured.");

builder.Services
    .AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        opt.SaveToken = true;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("access_token", out var cookie))
                    ctx.Token = cookie;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p =>
        p.SetIsOriginAllowed(_ => true)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuditService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Rate limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("login", cfg =>
    {
        cfg.PermitLimit = 10;
        cfg.Window = TimeSpan.FromMinutes(1);
    });
});

// ── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    await DbSeeder.SeedAsync(app.Services);
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoints ─────────────────────────────────────────────────────────────────
var api = app.MapGroup("/api/v1");
AuthEndpoints.Map(api);
PatientEndpoints.Map(api);
SessionEndpoints.Map(api);
DocumentEndpoints.Map(api);

app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", ts = DateTimeOffset.UtcNow }));

await app.RunAsync();
