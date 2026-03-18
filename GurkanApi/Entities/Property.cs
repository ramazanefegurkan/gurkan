namespace GurkanApi.Entities;

public class Property
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? GroupId { get; set; }

    public Group? Group { get; set; }
}
