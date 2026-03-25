using GurkanApi.Data;
using GurkanApi.DTOs.Subscriptions;
using GurkanApi.Entities;
using GurkanApi.Extensions;
using GurkanApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Controllers;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class AllSubscriptionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;

    public AllSubscriptionsController(ApplicationDbContext db, IGroupAccessService access)
    {
        _db = db;
        _access = access;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.GetUserId();
        var role = User.GetRole();

        IQueryable<PropertySubscription> query = _db.PropertySubscriptions
            .Include(ps => ps.Property)
            .Include(ps => ps.HolderUser)
            .Include(ps => ps.AutoPaymentBank);

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            query = query.Where(ps => ps.Property.GroupId != null && groupIds.Contains(ps.Property.GroupId.Value));
        }

        var subscriptions = await query.OrderBy(ps => ps.Property.Name).ThenBy(ps => ps.Type).ToListAsync();

        return Ok(subscriptions.Select(s => new
        {
            s.Id,
            s.PropertyId,
            PropertyName = s.Property.Name,
            s.Type,
            s.SubscriptionNo,
            s.HolderType,
            s.HolderUserId,
            HolderUserName = s.HolderUser?.FullName,
            s.HasAutoPayment,
            s.AutoPaymentBankId,
            AutoPaymentBankName = s.AutoPaymentBank?.Name,
        }));
    }
}
