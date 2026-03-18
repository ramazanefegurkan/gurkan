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
    BankTransfer,
    Check
}

public enum RentalPlatform
{
    Airbnb,
    Booking,
    Direct
}
