namespace GurkanApi.DTOs.Import;

public class ImportSummary
{
    public int TotalRows { get; set; }
    public int ImportedCount { get; set; }
    public int ErrorCount { get; set; }
    public int WarningCount { get; set; }
    public int DuplicateCount { get; set; }
}
