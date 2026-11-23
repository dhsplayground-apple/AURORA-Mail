# AURORA Mail

A cross-provider email prototype built with Expo and React Native.

## Architecture

This prototype includes Gmail OAuth, Microsoft OAuth, and a provider-neutral unified-inbox UI. FastHost and direct IMAP/SMTP access require native/server networking and credentials, so those are exposed through a secure backend adapter rather than embedded in the app.

## Environment

Copy `.env.example` and configure provider credentials.

```bash
cp .env.example .env
npm install
npx expo start
```

## OAuth setup

### Gmail

Enable the Gmail API in Google Cloud, configure an OAuth consent screen, and create iOS, Android, and/or web OAuth clients. Add their public client IDs to `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`.

### Microsoft / Outlook

Register a public client app in Microsoft Entra with a mobile/desktop redirect URI or web redirect URI. Enable Microsoft Graph delegated permissions for `Mail.Read`, `Mail.Send`, and `offline_access`. Add the application (client) ID to `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`.

The app uses public OAuth clients and in-memory access tokens. It does not contain or request provider client secrets.

## Secure backend

For refresh tokens, FastHost IMAP/SMTP, and production mailbox mutations, deploy `server.example.js` behind authentication and use `EXPO_PUBLIC_AURORA_API_URL`. Do not ship OAuth secrets or mailbox passwords in Expo environment variables or publish them in the repository.
