# EchoNotes feature parity

| Web capability           | Mobile implementation                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| IndexedDB workspace      | SQLite workspace with legacy-schema migration                                        |
| Guest-first access       | Immediate offline guest workspace; auth is optional                                  |
| Account data isolation   | Composite note/folder ownership keys                                                 |
| Guest merge choice       | Merge or keep separate prompt after sign-in                                          |
| Offline operation queue  | Durable SQLite upsert/delete queue                                                   |
| Reconnect/retry/realtime | NetInfo reconnect sync, retained failures, Supabase Realtime refresh, one sync guard |
| Conflict handling        | Dirty-local protection with newest timestamp resolution                              |
| Notes and organization   | Notes, folders, tags, search/#tag search, favorites and trash                        |
| Permanent deletion       | Queued Supabase delete after local deletion                                          |
| Welcome note             | Fixed read-only first note for every workspace                                       |
| Mobile navigation        | Focused single-note editor without desktop-style note tabs                           |
| Markdown                 | Source/preview switch, selection toolbar and formatted code blocks                   |
| Exports/imports          | PDF, Markdown, text, document import and native share sheet                          |
| Public links             | Supabase read-only note share records and copyable web URL                           |
| Settings                 | Editor mode/size, spellcheck, autosave persistence and logout retention              |
| Theme                    | Functional Dark, Light and System appearance modes                                   |
| Account tools            | Login, signup, reset email, profile and signout                                      |
| Alerts/help/feedback     | Local alerts plus Supabase bug/feature submissions                                   |
| Basic/Pro limits         | Subscription overview and server-enforced 2/5-device registration                    |
| Paystack                 | Secure handoff to the deployed web billing page; no payment secret in mobile         |

PWA installation/service workers are intentionally not copied: the installed Expo application and bundled native assets are the mobile equivalent.
