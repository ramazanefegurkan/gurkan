using GurkanApi.Data;
using GurkanApi.DTOs.BankAccounts;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/bank-accounts")]
[Authorize]
public class BankAccountsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<BankAccountsController> _logger;

    public BankAccountsController(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<BankAccountsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    /// <summary>
    /// List bank accounts for a group. Superadmin sees all; members see only their groups.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? groupId)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<BankAccount> query = _db.BankAccounts;

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(ba => groupIds.Contains(ba.GroupId));
        }

        if (groupId.HasValue)
            query = query.Where(ba => ba.GroupId == groupId.Value);

        var accounts = await query.OrderBy(ba => ba.HolderName).ThenBy(ba => ba.BankName).ToListAsync();
        return Ok(accounts.Select(MapResponse).ToList());
    }

    /// <summary>
    /// Get a bank account by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var account = await _db.BankAccounts.FindAsync(id);
        if (account is null)
            return NotFound(new { error = "not_found", message = "Bank account not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, account.GroupId))
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this bank account." });

        return Ok(MapResponse(account));
    }

    /// <summary>
    /// Create a bank account. User must have access to the specified group.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBankAccountRequest request)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        var group = await _db.Groups.FindAsync(request.GroupId);
        if (group is null)
            return NotFound(new { error = "not_found", message = "Group not found." });

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, request.GroupId))
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this group." });

        var account = new BankAccount
        {
            Id = Guid.NewGuid(),
            GroupId = request.GroupId,
            HolderName = request.HolderName,
            BankName = request.BankName,
            IBAN = request.IBAN,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
        };

        _db.BankAccounts.Add(account);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank account created: Id={Id}, Group={GroupId}, By={UserId}",
            account.Id, account.GroupId, userId);

        return StatusCode(201, MapResponse(account));
    }

    /// <summary>
    /// Update a bank account. Applies only non-null fields.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBankAccountRequest request)
    {
        var account = await _db.BankAccounts.FindAsync(id);
        if (account is null)
            return NotFound(new { error = "not_found", message = "Bank account not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, account.GroupId))
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this bank account." });

        if (request.HolderName is not null) account.HolderName = request.HolderName;
        if (request.BankName is not null) account.BankName = request.BankName;
        if (request.IBAN is not null) account.IBAN = request.IBAN;
        if (request.Description is not null) account.Description = request.Description;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank account updated: Id={Id}, By={UserId}", id, userId);
        return Ok(MapResponse(account));
    }

    /// <summary>
    /// Delete a bank account. Properties referencing it will have DefaultBankAccountId set to null.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var account = await _db.BankAccounts.FindAsync(id);
        if (account is null)
            return NotFound(new { error = "not_found", message = "Bank account not found." });

        var userId = User.GetUserId();
        var role = User.GetRole();

        if (role != UserRole.SuperAdmin && !await _access.IsUserInGroupAsync(userId, account.GroupId))
            return StatusCode(403, new { error = "forbidden", message = "You don't have access to this bank account." });

        // Clear references in properties
        var referencingProperties = await _db.Properties
            .Where(p => p.DefaultBankAccountId == id)
            .ToListAsync();
        foreach (var prop in referencingProperties)
            prop.DefaultBankAccountId = null;

        _db.BankAccounts.Remove(account);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Bank account deleted: Id={Id}, By={UserId}", id, userId);
        return NoContent();
    }

    private static BankAccountResponse MapResponse(BankAccount ba) => new()
    {
        Id = ba.Id,
        GroupId = ba.GroupId,
        HolderName = ba.HolderName,
        BankName = ba.BankName,
        IBAN = ba.IBAN,
        Description = ba.Description,
        CreatedAt = ba.CreatedAt,
    };
}
