namespace GurkanApi.Services;

using GurkanApi.Entities;

public class ParsedBill
{
    public BillType? BillType { get; set; }
    public decimal? Amount { get; set; }
    public Currency? Currency { get; set; }
    public DateTime? DueDate { get; set; }
    public string? SubscriberNo { get; set; }
    public string? Provider { get; set; }
    public bool IsRecognized { get; set; }
}

public interface IBillParserService
{
    Task<ParsedBill> ParseBillImageAsync(byte[] imageData);
    Task<ParsedBill> ParseBillTextAsync(string text);
}
