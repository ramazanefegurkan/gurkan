using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GurkanApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDismissedNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DismissedNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    NotificationKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DismissedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DismissedNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DismissedNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DismissedNotifications_UserId_NotificationKey",
                table: "DismissedNotifications",
                columns: new[] { "UserId", "NotificationKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DismissedNotifications");
        }
    }
}
