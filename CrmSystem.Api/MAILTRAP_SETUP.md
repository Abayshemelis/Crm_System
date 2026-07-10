# Mailtrap setup for local email testing

Use Mailtrap to test password reset and other email flows without sending messages to a real mailbox.

## 1. Create a Mailtrap inbox
- Sign up at https://mailtrap.io
- Create an inbox
- Open the inbox and copy the SMTP credentials

## 2. Configure the API
The API already reads SMTP settings from the development configuration. For local development, the easiest approach is to set them with user secrets.

Run these commands from the workspace root in PowerShell:

```powershell
dotnet user-secrets set "Smtp:Host" "smtp.mailtrap.io" --project CrmSystem.Api
dotnet user-secrets set "Smtp:Port" "2525" --project CrmSystem.Api
dotnet user-secrets set "Smtp:Username" "YOUR_MAILTRAP_USERNAME" --project CrmSystem.Api
dotnet user-secrets set "Smtp:Password" "YOUR_MAILTRAP_PASSWORD" --project CrmSystem.Api
dotnet user-secrets set "Smtp:From" "noreply@crmtest.local" --project CrmSystem.Api
dotnet user-secrets set "Smtp:EnableSsl" "true" --project CrmSystem.Api
```

## 3. Restart the API
After setting the values, restart the API and trigger the Forgot Password flow.

## 4. Check the Mailtrap inbox
Open the Mailtrap inbox in your browser and inspect the password reset email.
