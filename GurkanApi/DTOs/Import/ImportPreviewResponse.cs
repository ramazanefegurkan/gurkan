namespace GurkanApi.DTOs.Import;

/// <summary>
/// Response returned by both import endpoints. Contains a summary and per-row results.
/// </summary>
public class ImportPreviewResponse<TRow>
{
    public ImportSummary Summary { get; set; } = new();
    public List<TRow> Rows { get; set; } = new();
}
