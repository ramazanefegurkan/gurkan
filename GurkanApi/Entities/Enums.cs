namespace GurkanApi.Entities;

public enum UserRole
{
    SuperAdmin,
    User
}

public enum GroupMemberRole
{
    Admin,
    Member
}

public enum PropertyType
{
    Apartment,
    House,
    Shop,
    Land,
    Office,
    Other
}

public enum Currency
{
    TRY,
    USD,
    EUR
}

public enum RentPaymentStatus
{
    Pending,
    Paid,
    Late,
    Cancelled
}

public enum PaymentMethod
{
    Cash,
    BankTransfer
}

public enum RentalPlatform
{
    Airbnb,
    Booking,
    Direct
}

public enum ExpenseCategory
{
    Maintenance,
    Repair,
    Tax,
    Insurance,
    Management,
    Other
}

public enum BillType
{
    Water,
    Electric,
    Gas,
    Internet,
    Dues
}

public enum BillPaymentStatus
{
    Pending,
    Paid,
    Overdue
}

public enum DocumentCategory
{
    TitleDeed,
    Contract,
    Insurance,
    Invoice,
    Photo,
    Other
}
