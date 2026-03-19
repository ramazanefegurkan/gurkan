using GurkanApi.Data;
using GurkanApi.DTOs.Notifications;
using GurkanApi.Entities;
using Microsoft.EntityFrameworkCore;

namespace GurkanApi.Services;

public class NotificationComputeService : INotificationComputeService
{
    private readonly ApplicationDbContext _db;
    private readonly IGroupAccessService _access;
    private readonly ILogger<NotificationComputeService> _logger;

    private static readonly Dictionary<string, int> SeverityOrder = new()
    {
        ["Critical"] = 0,
        ["Warning"] = 1,
        ["Info"] = 2,
    };

    public NotificationComputeService(
        ApplicationDbContext db,
        IGroupAccessService access,
        ILogger<NotificationComputeService> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    public async Task<List<NotificationItem>> ComputeNotificationsAsync(Guid userId, UserRole role)
    {
        // --- Resolve accessible property IDs ---
        IQueryable<Property> propertyQuery = _db.Properties;

        if (role != UserRole.SuperAdmin)
        {
            var groupIds = await _access.GetUserGroupIdsAsync(userId);
            propertyQuery = propertyQuery.Where(p => p.GroupId != null && groupIds.Contains(p.GroupId.Value));
        }

        var properties = await propertyQuery
            .Select(p => new { p.Id, p.Name })
            .ToListAsync();

        var propertyIds = properties.Select(p => p.Id).ToList();
        var propertyLookup = properties.ToDictionary(p => p.Id, p => p.Name);
        var now = DateTime.UtcNow;

        var notifications = new List<NotificationItem>();

        // --- Late rent: Pending + DueDate+5 < now ---
        var lateRents = await _db.RentPayments
            .Include(rp => rp.Tenant)
            .Where(rp => propertyIds.Contains(rp.Tenant.PropertyId)
                      && rp.Status == RentPaymentStatus.Pending
                      && rp.DueDate.AddDays(5) < now)
            .ToListAsync();

        foreach (var rp in lateRents)
        {
            notifications.Add(new NotificationItem
            {
                Key = $"LateRent:{rp.Id}",
                Type = "LateRent",
                Severity = "Critical",
                Message = $"Kira ödemesi gecikti: {rp.Tenant.FullName} - {rp.Amount} {rp.Currency} (Vade: {rp.DueDate:dd.MM.yyyy})",
                PropertyId = rp.Tenant.PropertyId,
                PropertyName = propertyLookup.GetValueOrDefault(rp.Tenant.PropertyId, ""),
                RelatedEntityId = rp.Id,
                Date = rp.DueDate,
            });
        }

        // --- Upcoming bills: not Paid, DueDate within 7 days from now ---
        var upcomingBills = await _db.Bills
            .Where(b => propertyIds.Contains(b.PropertyId)
                     && b.Status != BillPaymentStatus.Paid
                     && b.DueDate <= now.AddDays(7)
                     && b.DueDate >= now)
            .ToListAsync();

        foreach (var bill in upcomingBills)
        {
            notifications.Add(new NotificationItem
            {
                Key = $"UpcomingBill:{bill.Id}",
                Type = "UpcomingBill",
                Severity = "Warning",
                Message = $"Fatura son ödeme yaklaşıyor: {bill.Type} - {bill.Amount} {bill.Currency} (Son ödeme: {bill.DueDate:dd.MM.yyyy})",
                PropertyId = bill.PropertyId,
                PropertyName = propertyLookup.GetValueOrDefault(bill.PropertyId, ""),
                RelatedEntityId = bill.Id,
                Date = bill.DueDate,
            });
        }

        // --- Overdue bills: Pending + DueDate < now ---
        var overdueBills = await _db.Bills
            .Where(b => propertyIds.Contains(b.PropertyId)
                     && b.Status == BillPaymentStatus.Pending
                     && b.DueDate < now)
            .ToListAsync();

        foreach (var bill in overdueBills)
        {
            notifications.Add(new NotificationItem
            {
                Key = $"OverdueBill:{bill.Id}",
                Type = "UpcomingBill",
                Severity = "Critical",
                Message = $"Fatura gecikmiş: {bill.Type} - {bill.Amount} {bill.Currency} (Son ödeme: {bill.DueDate:dd.MM.yyyy})",
                PropertyId = bill.PropertyId,
                PropertyName = propertyLookup.GetValueOrDefault(bill.PropertyId, ""),
                RelatedEntityId = bill.Id,
                Date = bill.DueDate,
            });
        }

        // --- Lease expiry: active tenants with LeaseEnd within 90 days ---
        var leaseExpiryThreshold = now.AddDays(90);
        var expiringLeases = await _db.Tenants
            .Where(t => propertyIds.Contains(t.PropertyId)
                     && t.IsActive
                     && t.LeaseEnd >= now
                     && t.LeaseEnd <= leaseExpiryThreshold)
            .ToListAsync();

        foreach (var tenant in expiringLeases)
        {
            var daysUntilExpiry = (tenant.LeaseEnd - now).TotalDays;
            var severity = daysUntilExpiry switch
            {
                <= 30 => "Critical",
                <= 60 => "Warning",
                _ => "Info",
            };

            notifications.Add(new NotificationItem
            {
                Key = $"LeaseExpiry:{tenant.Id}",
                Type = "LeaseExpiry",
                Severity = severity,
                Message = $"Kira sözleşmesi bitiyor: {tenant.FullName} (Bitiş: {tenant.LeaseEnd:dd.MM.yyyy})",
                PropertyId = tenant.PropertyId,
                PropertyName = propertyLookup.GetValueOrDefault(tenant.PropertyId, ""),
                RelatedEntityId = tenant.Id,
                Date = tenant.LeaseEnd,
            });
        }

        // --- Rent increase: upcoming within 30 days ---
        var rentIncreaseThreshold = now.AddDays(30);
        var upcomingIncreases = await _db.RentIncreases
            .Include(ri => ri.Tenant)
            .Where(ri => propertyIds.Contains(ri.Tenant.PropertyId)
                      && ri.EffectiveDate > now
                      && ri.EffectiveDate <= rentIncreaseThreshold)
            .ToListAsync();

        foreach (var ri in upcomingIncreases)
        {
            notifications.Add(new NotificationItem
            {
                Key = $"RentIncrease:{ri.Id}",
                Type = "RentIncrease",
                Severity = "Info",
                Message = $"Kira artışı yaklaşıyor: {ri.Tenant.FullName} - {ri.NewAmount} {ri.Tenant.Currency} (Tarih: {ri.EffectiveDate:dd.MM.yyyy})",
                PropertyId = ri.Tenant.PropertyId,
                PropertyName = propertyLookup.GetValueOrDefault(ri.Tenant.PropertyId, ""),
                RelatedEntityId = ri.Id,
                Date = ri.EffectiveDate,
            });
        }

        // --- Filter out dismissed notifications ---
        var allKeys = notifications.Select(n => n.Key).ToList();
        var dismissedKeys = await _db.DismissedNotifications
            .Where(dn => dn.UserId == userId && allKeys.Contains(dn.NotificationKey))
            .Select(dn => dn.NotificationKey)
            .ToHashSetAsync();

        var filtered = notifications
            .Where(n => !dismissedKeys.Contains(n.Key))
            .ToList();

        // Sort: Critical first, then Warning, then Info; within same severity by Date ascending
        var sorted = filtered
            .OrderBy(n => SeverityOrder.GetValueOrDefault(n.Severity, 99))
            .ThenBy(n => n.Date)
            .ToList();

        _logger.LogInformation("Notifications computed: UserId={UserId}, Count={Count}",
            userId, sorted.Count);

        return sorted;
    }
}
