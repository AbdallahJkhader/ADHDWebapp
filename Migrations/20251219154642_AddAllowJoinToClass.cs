using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ADHDWebapp.Migrations
{
    /// <inheritdoc />
    public partial class AddAllowJoinToClass : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowJoin",
                table: "Classes",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowJoin",
                table: "Classes");
        }
    }
}
