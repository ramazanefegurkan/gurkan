using GurkanApi.Data;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize]
public class AllTenantsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;

    public AllTenantsController(ApplicationDbContext db, IGroupAccessService access)
    {
        _db = db;
        _access = access;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? active)
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<Tenant> query = _db.Tenants.Include(t => t.Property);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(t => t.Property.GroupId != null && groupIds.Contains(t.Property.GroupId.Value));
        }

        if (active.HasValue)
            query = query.Where(t => t.IsActive == active.Value);

        var tenants = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        return Ok(tenants.Select(t => new
        {
            t.Id,
            t.PropertyId,
            PropertyName = t.Property.Name,
            t.FullName,
            t.Phone,
            t.Email,
            t.LeaseStart,
            t.LeaseEnd,
            t.MonthlyRent,
            t.Currency,
            t.IsActive,
        }));
    }
}
