# AURORA Mail

An Expo and React Native email client prototype with a Superhuman-inspired, keyboard-first visual direction.

## Run

```bash
cp .env.example .env
# Fill in the Google OAuth client IDs (instructions below)
npm install
npx expo start
```

## Gmail OAuth setup

1. In Google Cloud Console, create/select a project and enable the **Gmail API**.
2. Configure the OAuth consent screen. Add the Gmail `gmail.readonly` scope; configure test users while the app is in testing.
3. Create OAuth client IDs for the platforms you intend to run and add them to `.env`:
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
4. For Android, register the application package name and signing-certificate SHA-1 in the Android OAuth client. For iOS, register the bundle identifier in the iOS OAuth client. For web, register the correct authorized redirect URI.
5. Use an Expo development build for native OAuth testing. Rebuild after changing the app scheme or native OAuth configuration.

OAuth client IDs are public identifiers, not secrets. **Never put a client secret or refresh token in this app or commit it to the repository.** The app requests only Gmail read-only access, holds its short-lived access token in memory, and asks the user to reconnect after it expires. It currently fetches the latest 20 inbox messages and their basic headers/snippets; it does not send, delete, or modify mail.

## Current limitations

- Gmail only; Outlook and FastHost are not connected.
- Access-token refresh and persistent sessions are not implemented.
- Messages are fetched directly from the Gmail API on the client; a production app should use a carefully designed backend for sensitive token lifecycle operations.
