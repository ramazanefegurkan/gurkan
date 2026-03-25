using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GurkanApi.Migrations
{
    /// <inheritdoc />
    public partial class RedesignSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DuesSubscriptionNo",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ElectricSubscriptionNo",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "GasSubscriptionNo",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "InternetSubscriptionNo",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "SubscriptionHolder",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "WaterSubscriptionNo",
                table: "Properties");

            migrationBuilder.CreateTable(
                name: "Banks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Banks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertySubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SubscriptionNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    HolderType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    HolderUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    HasAutoPayment = table.Column<bool>(type: "boolean", nullable: false),
                    AutoPaymentBankId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertySubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertySubscriptions_Banks_AutoPaymentBankId",
                        column: x => x.AutoPaymentBankId,
                        principalTable: "Banks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PropertySubscriptions_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PropertySubscriptions_Users_HolderUserId",
                        column: x => x.HolderUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Banks_Name",
                table: "Banks",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PropertySubscriptions_AutoPaymentBankId",
                table: "PropertySubscriptions",
                column: "AutoPaymentBankId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertySubscriptions_HolderUserId",
                table: "PropertySubscriptions",
                column: "HolderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertySubscriptions_PropertyId_Type",
                table: "PropertySubscriptions",
                columns: new[] { "PropertyId", "Type" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PropertySubscriptions");

            migrationBuilder.DropTable(
                name: "Banks");

            migrationBuilder.AddColumn<string>(
                name: "DuesSubscriptionNo",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ElectricSubscriptionNo",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GasSubscriptionNo",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InternetSubscriptionNo",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionHolder",
                table: "Properties",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WaterSubscriptionNo",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
