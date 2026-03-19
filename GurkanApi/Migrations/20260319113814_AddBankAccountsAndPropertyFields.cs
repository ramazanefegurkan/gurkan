using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GurkanApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAccountsAndPropertyFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BankAccountId",
                table: "RentPayments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DefaultBankAccountId",
                table: "Properties",
                type: "uuid",
                nullable: true);

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
                name: "TitleDeedOwner",
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

            migrationBuilder.CreateTable(
                name: "BankAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    HolderName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BankName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IBAN = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankAccounts_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RentPayments_BankAccountId",
                table: "RentPayments",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_DefaultBankAccountId",
                table: "Properties",
                column: "DefaultBankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_BankAccounts_GroupId",
                table: "BankAccounts",
                column: "GroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_BankAccounts_DefaultBankAccountId",
                table: "Properties",
                column: "DefaultBankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_RentPayments_BankAccounts_BankAccountId",
                table: "RentPayments",
                column: "BankAccountId",
                principalTable: "BankAccounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_BankAccounts_DefaultBankAccountId",
                table: "Properties");

            migrationBuilder.DropForeignKey(
                name: "FK_RentPayments_BankAccounts_BankAccountId",
                table: "RentPayments");

            migrationBuilder.DropTable(
                name: "BankAccounts");

            migrationBuilder.DropIndex(
                name: "IX_RentPayments_BankAccountId",
                table: "RentPayments");

            migrationBuilder.DropIndex(
                name: "IX_Properties_DefaultBankAccountId",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "RentPayments");

            migrationBuilder.DropColumn(
                name: "DefaultBankAccountId",
                table: "Properties");

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
                name: "TitleDeedOwner",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "WaterSubscriptionNo",
                table: "Properties");
        }
    }
}
