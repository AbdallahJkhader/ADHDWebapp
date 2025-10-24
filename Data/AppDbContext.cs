using Microsoft.EntityFrameworkCore;
using ADHDWebApp.Models;

namespace ADHDWebApp.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserFile> UserFiles { get; set; }
        public DbSet<SharedFile> SharedFiles { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<ClassMembership> ClassMemberships { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<UserFile>()
                .HasOne(f => f.User)
                .WithMany(u => u.Files)
                .HasForeignKey(f => f.UserId);

            

            // SharedFile configuration
            modelBuilder.Entity<SharedFile>(entity =>
            {
                entity.HasOne(sf => sf.Sender)
                      .WithMany()
                      .HasForeignKey(sf => sf.SenderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sf => sf.Recipient)
                      .WithMany()
                      .HasForeignKey(sf => sf.RecipientId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sf => sf.OriginalFile)
                      .WithMany()
                      .HasForeignKey(sf => sf.OriginalFileId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Message configuration
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasOne(m => m.Sender)
                      .WithMany()
                      .HasForeignKey(m => m.SenderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Recipient)
                      .WithMany()
                      .HasForeignKey(m => m.RecipientId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Class configuration
            modelBuilder.Entity<Class>(entity =>
            {
                entity.HasIndex(c => c.JoinCode).IsUnique();
                entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
                entity.Property(c => c.JoinCode).HasMaxLength(12).IsRequired();
                entity.HasOne(c => c.Owner)
                      .WithMany()
                      .HasForeignKey(c => c.OwnerId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ClassMembership configuration
            modelBuilder.Entity<ClassMembership>(entity =>
            {
                entity.HasIndex(cm => new { cm.UserId, cm.ClassId }).IsUnique();
                entity.HasOne(cm => cm.User)
                      .WithMany()
                      .HasForeignKey(cm => cm.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(cm => cm.Class)
                      .WithMany(c => c.Members)
                      .HasForeignKey(cm => cm.ClassId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}