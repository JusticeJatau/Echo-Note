# EchoNotes Mobile (Expo SDK 54)

Native offline-first companion to the EchoNotes web app. This remains a classic blank-JavaScript Expo project (`index.js` → `App.js`), not Expo Router.

## Run it

1. Install Node.js 20.19 or newer.
2. Copy `.env.example` to `.env` and add your Supabase URL/publishable key and deployed web URL.
3. Run `npm install`.
4. Run `npx expo start -c`, then scan the QR code with an SDK 54-compatible Expo Go app.

Never put `SUPABASE_SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` in the mobile `.env`. Paystack checkout and subscription management open the deployed EchoNotes billing page, where those secrets remain server-side.

## Included

- Immediate guest workspace with a permanent welcome note
- SQLite offline storage, account-separated workspaces, operation queue, reconnect retry and Supabase Realtime refresh
- Optional email auth, password reset, guest-note merge choice, and keep-data-after-signout preference
- Notes, folders, tags, text/#tag search, favorites, trash, restore, and permanent deletion
- Multiple closable note tabs
- Markdown source and preview modes, formatting toolbar, formatted code blocks, word count, and autosave
- PDF, Markdown and text export; Markdown/text import; native sharing and public read-only links
- Alerts, help, bug reports, feature requests, profile settings and functional editor preferences
- Basic/Pro overview, secure Paystack web handoff, device registration, plan limits, and device removal
- Encrypted nearby clipboard pairing and text transfer with EchoNotes Desktop Bridge over local Wi-Fi or hotspot

## Nearby clipboard

Nearby clipboard does not use Supabase or require internet. Install and open the
Windows bridge, select **Pair a device**, then open **Settings → Nearby clipboard
sync → Scan PC QR** on Android. Compare the six-digit code and approve the phone
on the PC.

The feature uses X25519 pairing, HMAC-SHA256 reconnection and
ChaCha20-Poly1305-encrypted clipboard messages. Trusted keys are kept in Android
secure storage and recent transfers are kept in the local SQLite database.

Android clipboard monitoring and the WebSocket connection remain active while
EchoNotes is in the foreground. Android may suspend both after the app enters the
background; reopen EchoNotes to reconnect automatically.

Because this version adds `expo-camera` and Android local-network build
configuration, create a new EAS build before testing the installed APK:

```bash
eas build --platform android --profile preview
```

## Supabase

Apply every migration from the web project's `supabase/migrations` directory before testing cloud features. The app uses the existing RLS policies and tables; no service-role credential is bundled.

## Offline test

Open the app once, create and edit notes, force-close it, disable Wi-Fi/mobile data, and reopen it. Notes remain editable. Sign in while online, edit offline again, then reconnect; queued changes should move through `offline` → `syncing` → `synced`.
