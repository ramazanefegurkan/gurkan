using GurkanApi.Entities;

namespace GurkanApi.DTOs.Tenants;

public class TenantListResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime LeaseStart { get; set; }
    public DateTime LeaseEnd { get; set; }
    public decimal MonthlyRent { get; set; }
    public Currency Currency { get; set; }
    public bool IsActive { get; set; }
}
