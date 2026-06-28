namespace CrmSystem.Infrastructure.Services;

public interface IPasswordHasher
{
    string Hash(string plainTextPassword);
    bool Verify(string plainTextPassword, string hash);
}

public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string plainTextPassword)
    {
        return BCrypt.Net.BCrypt.HashPassword(plainTextPassword, workFactor: 12);
    }

    public bool Verify(string plainTextPassword, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(plainTextPassword, hash);
    }
}