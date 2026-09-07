# EchoNotes Mobile

React Native/Expo foundation for the EchoNotes mobile app. It uses the existing Supabase project and keeps mobile data in SQLite first.

## Start

1. Install Node.js 20.19 or newer.
2. Copy `.env.example` to `.env` and add the same Supabase URL and publishable key used by the web app.
3. Run `npm install`.
4. Run `npx expo install --fix` so Expo pins every native package to the exact SDK-compatible version.
5. Run `npx expo start -c` and open it with an SDK 54-compatible Expo Go app on Android or iOS.

## Implemented foundation

- Classic `App.js` entry with React Navigation
- Email/password authentication
- Secure persisted Supabase session
- Four-tab mobile layout
- SQLite notes table and operation queue
- Offline create/edit/favorite
- Search and guest-local workspace separation

Cloud synchronization, full folders, Markdown live preview, device registration, billing, and feedback are deliberately scheduled for the next milestones.
