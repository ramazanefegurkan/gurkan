using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GurkanApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTelegramUserLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TelegramUserLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TelegramUserId = table.Column<long>(type: "bigint", nullable: false),
                    TelegramUsername = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LinkCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    LinkCodeExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsLinked = table.Column<bool>(type: "boolean", nullable: false),
                    LinkedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelegramUserLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TelegramUserLinks_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TelegramUserLinks_LinkCode",
                table: "TelegramUserLinks",
                column: "LinkCode");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramUserLinks_TelegramUserId",
                table: "TelegramUserLinks",
                column: "TelegramUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TelegramUserLinks_UserId",
                table: "TelegramUserLinks",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TelegramUserLinks");
        }
    }
}
