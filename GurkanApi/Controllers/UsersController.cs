using GurkanApi.Data;
using GurkanApi.DTOs.Users;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ApplicationDbContext db, ILogger<UsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// List all users. Superadmin only.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (!User.IsSuperAdmin())
            return StatusCode(403, new { error = "forbidden", message = "Only superadmin can view all users." });

        var users = await _db.Users
            .Include(u => u.Groups)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var response = users.Select(u => new UserResponse
        {
            Id = u.Id,
            Email = u.Email,
            FullName = u.FullName,
            Role = u.Role,
            CreatedAt = u.CreatedAt,
            GroupCount = u.Groups.Count,
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Update a user's global role. Superadmin only. Cannot demote yourself.
    /// </summary>
    [HttpPatch("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        if (!User.IsSuperAdmin())
            return StatusCode(403, new { error = "forbidden", message = "Only superadmin can change user roles." });

        var currentUserId = User.GetUserId();
        if (currentUserId == id)
            return BadRequest(new { error = "self_demote", message = "You cannot change your own role." });

        var user = await _db.Users
            .Include(u => u.Groups)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { error = "not_found", message = "User not found." });

        var previousRole = user.Role;
        user.Role = request.Role;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User role updated: UserId={UserId}, From={PreviousRole}, To={NewRole}, By={ActorId}",
            id, previousRole, request.Role, currentUserId);

        return Ok(new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
            GroupCount = user.Groups.Count,
        });
    }
}
