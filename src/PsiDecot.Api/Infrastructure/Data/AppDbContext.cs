using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PsiDecot.Api.Domain.Entities;

namespace PsiDecot.Api.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RefreshToken>      RefreshTokens     { get; set; }
    public DbSet<Patient>           Patients          { get; set; }
    public DbSet<SessionRecord>     Sessions          { get; set; }
    public DbSet<PatientDocument>   PatientDocuments  { get; set; }
    public DbSet<SessionDocument>   SessionDocuments  { get; set; }
    public DbSet<Medication>        Medications       { get; set; }
    public DbSet<AuditLog>          AuditLogs         { get; set; }

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ── Schema ────────────────────────────────────────────────────────────────
        b.HasDefaultSchema("psidecot");

        // ── ApplicationUser ───────────────────────────────────────────────────────
        b.Entity<ApplicationUser>(e =>
        {
            e.Property(u => u.FullName).HasMaxLength(200).IsRequired();
            e.Property(u => u.Crp).HasMaxLength(20);
            e.Property(u => u.Specialty).HasMaxLength(200);
        });

        // ── RefreshToken ──────────────────────────────────────────────────────────
        b.Entity<RefreshToken>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Token).HasMaxLength(512).IsRequired();
            e.HasIndex(t => t.Token).IsUnique();
            e.HasOne(t => t.User)
             .WithMany(u => u.RefreshTokens)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Patient ───────────────────────────────────────────────────────────────
        b.Entity<Patient>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.FullName).HasMaxLength(300).IsRequired();
            e.Property(p => p.Cpf).HasMaxLength(14).IsRequired();   // "000.000.000-00"
            e.Property(p => p.Phone).HasMaxLength(20);
            e.Property(p => p.Email).HasMaxLength(320);
            e.Property(p => p.Gender).HasMaxLength(50);
            e.Property(p => p.MaritalStatus).HasMaxLength(50);
            e.Property(p => p.Address).HasMaxLength(500);
            e.Property(p => p.EmergencyContact).HasMaxLength(300);

            e.HasIndex(p => new { p.UserId, p.Cpf }).IsUnique();
            e.HasIndex(p => new { p.UserId, p.IsActive });
            e.HasIndex(p => p.FullName);

            e.HasOne(p => p.User)
             .WithMany()
             .HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── SessionRecord ─────────────────────────────────────────────────────────
        b.Entity<SessionRecord>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Notes).IsRequired();
            e.Property(s => s.DurationMin).HasDefaultValue(50);
            e.Property(s => s.Mood).HasConversion<int>();

            e.HasIndex(s => new { s.PatientId, s.SessionDate });

            e.HasOne(s => s.Patient)
             .WithMany(p => p.Sessions)
             .HasForeignKey(s => s.PatientId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(s => s.User)
             .WithMany()
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PatientDocument ───────────────────────────────────────────────────────
        b.Entity<PatientDocument>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.FileName).HasMaxLength(500).IsRequired();
            e.Property(d => d.StorageKey).HasMaxLength(1000).IsRequired();
            e.Property(d => d.ContentType).HasMaxLength(100);

            e.HasOne(d => d.Patient)
             .WithMany(p => p.Documents)
             .HasForeignKey(d => d.PatientId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SessionDocument ───────────────────────────────────────────────────────
        b.Entity<SessionDocument>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.FileName).HasMaxLength(500).IsRequired();
            e.Property(d => d.StorageKey).HasMaxLength(1000).IsRequired();

            e.HasOne(d => d.Session)
             .WithMany(s => s.Documents)
             .HasForeignKey(d => d.SessionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Medication ────────────────────────────────────────────────────────────
        b.Entity<Medication>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.Name).HasMaxLength(200).IsRequired();
            e.Property(m => m.Dosage).HasMaxLength(100);
            e.Property(m => m.Frequency).HasMaxLength(100);
            e.Property(m => m.Prescriber).HasMaxLength(200);

            e.HasIndex(m => new { m.PatientId, m.IsActive });

            e.HasOne(m => m.Patient)
             .WithMany(p => p.Medications)
             .HasForeignKey(m => m.PatientId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── AuditLog ──────────────────────────────────────────────────────────────
        b.Entity<AuditLog>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).UseIdentityByDefaultColumn();
            e.Property(a => a.Action).HasMaxLength(100).IsRequired();
            e.Property(a => a.EntityType).HasMaxLength(100);
            e.Property(a => a.EntityId).HasMaxLength(100);
            e.Property(a => a.IpAddress).HasMaxLength(50);
            // AuditLog é write-only — sem updates/deletes
            e.ToTable(tb => tb.HasComment("Immutable audit trail"));
            e.HasIndex(a => new { a.UserId, a.Timestamp });
            e.HasIndex(a => new { a.EntityType, a.EntityId });
        });
    }

    // ── SaveChanges com UpdatedAt automático ──────────────────────────────────────
    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Modified)
            {
                var prop = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
                if (prop is not null) prop.CurrentValue = now;
            }
        }
        return base.SaveChangesAsync(ct);
    }
}

// ── Dev Seeder ────────────────────────────────────────────────────────────────
public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db      = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Sem migrations geradas — cria schema direto do modelo
        await db.Database.EnsureCreatedAsync();

        if (await userMgr.FindByEmailAsync("anaclaradecot8@gmail.com") is null)
        {
            var user = new ApplicationUser
            {
                UserName  = "anaclara",
                Email     = "anaclaradecot8@gmail.com",
                FullName  = "Ana Clara Decot",
                Crp       = "05/65773",
                Specialty = "Psicologia Clínica",
                EmailConfirmed = true,
            };
            await userMgr.CreateAsync(user, "Dev@123456!");
        }
    }
}
