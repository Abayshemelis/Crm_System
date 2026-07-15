using System;
using Microsoft.Data.SqlClient;

var connectionString = "Server=(localdb)\\mssqllocaldb;Database=CrmSystemDb;Trusted_Connection=true;MultipleActiveResultSets=true";

using var connection = new SqlConnection(connectionString);
connection.Open();

var checkCmd = new SqlCommand(@"
    IF COL_LENGTH('AuditLogs', 'IsDeleted') IS NULL
    BEGIN
        ALTER TABLE AuditLogs ADD IsDeleted bit NOT NULL DEFAULT 0
        PRINT 'Column added successfully'
    END
    ELSE
    BEGIN
        PRINT 'Column already exists'
    END
", connection);

var result = checkCmd.ExecuteScalar();
Console.WriteLine(result?.ToString() ?? "Command executed");