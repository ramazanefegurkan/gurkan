using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GurkanApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyFieldsAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Properties",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Area",
                table: "Properties",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BuildYear",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Properties",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now() at time zone 'utc'");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Properties",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Properties",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "Properties",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Floor",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RoomCount",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalFloors",
                table: "Properties",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Properties",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Properties",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PropertyNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyNotes_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PropertyNotes_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PropertyNotes_CreatedBy",
                table: "PropertyNotes",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyNotes_PropertyId",
                table: "PropertyNotes",
                column: "PropertyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PropertyNotes");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Area",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "BuildYear",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "City",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "District",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Floor",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "RoomCount",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "TotalFloors",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Properties");
        }
    }
}
