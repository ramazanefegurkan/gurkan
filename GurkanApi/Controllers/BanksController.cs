using GurkanApi.Data;
using GurkanApi.DTOs.Banks;
using GurkanApi.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BanksController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public BanksController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var banks = await _db.Banks.OrderBy(b => b.Name).ToListAsync();
        return Ok(banks.Select(b => new BankResponse { Id = b.Id, Name = b.Name, CreatedAt = b.CreatedAt }));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBankRequest request)
    {
        var exists = await _db.Banks.AnyAsync(b => b.Name == request.Name);
        if (exists)
            return Conflict(new { error = "duplicate", message = "Bu banka zaten kayıtlı." });

        var bank = new Bank
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Banks.Add(bank);
        await _db.SaveChangesAsync();

        return StatusCode(201, new BankResponse { Id = bank.Id, Name = bank.Name, CreatedAt = bank.CreatedAt });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var bank = await _db.Banks.FindAsync(id);
        if (bank is null)
            return NotFound(new { error = "not_found", message = "Bank not found." });

        _db.Banks.Remove(bank);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
