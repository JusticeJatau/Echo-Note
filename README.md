# Echo Notes

EchoNOTES — MASTER LOVABLE BUILD PROMPT

1. PROJECT OVERVIEW

Build EchoNotes**, a modern personal note-taking application.

EchoNotes is designed for:

Developers


Students


Creators


Professionals


Anyone who needs a fast and organized personal notes system


The product should feel:

Fast


Minimal


Clean


Personal


Professional


Calm


Developer-friendly


Modern


Easy to understand


Easy to navigate


The goal is NOT to build a Notion clone.

The core experience should be:

Open → write → organize → find → done.

2. CRITICAL UI INSTRUCTION — THE PROVIDED UI IS THE SOURCE OF TRUTH

I already have the complete UI/design for EchoNotes.

The provided UI screenshot/image is the PRIMARY VISUAL SOURCE OF TRUTH.

You MUST reproduce the provided UI as accurately as possible.

Do NOT redesign it.

Do NOT reinterpret it.

Do NOT replace it with your own design.

Do NOT generate a generic AI SaaS dashboard.

Do NOT use a different layout simply because you think it looks better.

Do NOT make unnecessary creative changes.

The implementation should visually match the provided UI.

When implementing every page and component, carefully reproduce:

Overall layout


Page structure


Sidebar placement


Navigation structure


Header placement


Content positioning


Cards


Buttons


Inputs


Search interface


Note list


Note editor


Modals


Dropdowns


Icons


Borders


Border radius


Shadows


Spacing


Padding


Margins


Alignment


Widths


Heights


Typography


Font family


Font weight


Font size


Line height


Letter spacing


Text color


Background colors


Accent colors


Hover states


Active states


Focus states


Empty states


Loading states


Error states


The screenshot should be treated like a design specification, not merely inspiration.

If there is a conflict between a generic Lovable design convention and the supplied EchoNotes UI, the EchoNotes UI wins.

3. VISUAL FIDELITY REQUIREMENT

Before implementing a page, inspect the provided UI carefully.

Pay attention to exact proportions and relationships between elements.

For example:

Sidebar width


Main content width


Editor width


Header height


Navigation item height


Button dimensions


Input height


Card spacing


Section spacing


Typography hierarchy


Icon sizes


Border thickness


Corner radius


Alignment


Whitespace


Do not approximate these values casually.

Where exact CSS values are visually identifiable, reproduce them closely.

The final implementation should look like the supplied design was actually converted into a working application.

4. TYPOGRAPHY

The provided UI determines the typography.

Use the exact font family shown in the supplied design whenever identifiable.

Do not randomly substitute a different font.

Maintain the typography hierarchy from the design:

Page titles


Section headings


Note titles


Body text


Metadata


Navigation labels


Buttons


Placeholder text


Helper text


Error messages


Preserve the visual relationships between:

Font family


Font size


Font weight


Line height


Letter spacing


Do not make all text the same size.

Do not make typography unnecessarily large.

Do not introduce a new typography system that conflicts with the supplied UI.

5. COLOR SYSTEM

The supplied UI is the primary source for colors.

The general visual direction is a dark, modern interface with near-black surfaces and purple/violet accents.

Reference colors may include:

#08090D


#0D0F14


#111318


#7C3AED


#8B5CF6


However, if the provided UI uses slightly different values, use the values that best match the actual supplied UI.

Maintain consistent colors for:

Application background


Sidebar


Cards


Inputs


Editor


Borders


Primary text


Secondary text


Muted text


Accent


Success


Warning


Error


Hover states


Active states


Do not introduce unnecessary colors.

6. RESPONSIVE STRATEGY

The primary design target is desktop.

Prioritize:

1280px


1440px


1600px


1920px


The desktop layout should be extremely close to the supplied UI.

The application should still behave properly on smaller screens, but do NOT destroy the desktop design in an attempt to make everything mobile-perfect immediately.

Mobile is a later expansion of the product.

The long-term product vision is:

Desktop Web → Tablet → Mobile → PWA/Mobile App

The current implementation should establish a strong desktop web experience first.

7. PLATFORM STRATEGY

EchoNotes will primarily be a web application.

The web application should work well as a desktop web app and should be structured so that it can later become a PWA.

The long-term EchoNotes ecosystem may include:

Desktop Web/PWA


Android application


iOS application


Users should eventually be able to access the same EchoNotes account and notes across devices.

The cloud backend should therefore be designed around synchronized user data.

8. TECH STACK

Use a straightforward modern stack.

Frontend:

React


Vite


JavaScript


Tailwind CSS


React Router


Zustand where useful


Lucide React for icons


Supabase


Backend:

Supabase


PostgreSQL


Supabase Authentication


Row Level Security


Supabase Storage where required


Supabase Realtime only where genuinely useful


Do NOT create a separate Express backend initially.

Keep the application simple.

9. DO NOT OVER-ENGINEER

This is extremely important.

Prefer:

Straightforward React components


Simple state management


Reusable components where genuinely useful


Clear Supabase queries


Simple data flow


Readable code


Maintainable code


Avoid unnecessary:

Repository patterns


Factory patterns


Dependency injection


Excessive service layers


Complex abstraction systems


Unnecessary API wrappers


Excessive custom hooks


Excessive folder nesting


Enterprise architecture


Complicated state machines


Libraries that do not provide real value


The codebase should remain easy to understand.

A developer should be able to open a file and quickly understand what it does.

10. APPLICATION STRUCTURE

Use a clean structure such as:

src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── lib/
├── store/
├── types/
├── utils/
├── assets/
├── App.jsx
└── main.jsx

Adjust this structure if the existing Lovable project already has a reasonable structure.

Do not restructure working code without a good reason.

11. APPLICATION LAYOUT

The authenticated application should follow the supplied UI.

Conceptually:

AppLayout
├── Sidebar
└── MainContent

The sidebar should contain the application's primary navigation according to the provided UI.

Potential navigation areas include:

Dashboard


Notes


Folders


Search


Favorites


Trash


Settings


Profile


Do not add navigation items that are not part of the design unless required by functionality.

12. ROUTING

Public routes should include:

/
/onboarding
/login
/signup
/forgot-password
/verify-email

Authenticated application routes should include the relevant EchoNotes application pages, such as:

/app
/app/notes
/app/folders
/app/search
/app/favorites
/app/trash
/app/settings
/app/profile

Use protected routes for authenticated areas.

Follow the visual design when implementing authentication pages.

13. AUTHENTICATION

Use Supabase Authentication.

Implement:

Signup


Login


Logout


Forgot password


Password reset


Email verification


Auth state handling


Protected routes


User profile


Do not build a custom authentication system when Supabase Auth already provides the required functionality.

14. NOTES

The core product is the notes system.

Users should be able to:

Create notes


Open notes


Edit notes


Save notes


Delete notes


Favorite notes


Archive notes


Restore deleted notes


Search notes


Organize notes


Move notes between folders


The note editor must closely reproduce the provided UI.

Do not replace the supplied editor design with a generic text editor.

15. NOTE DATA MODEL

A note should support fields such as:

id


user_id


folder_id


title


content


is_favorite


is_archived


is_deleted


created_at


updated_at


Every user's notes must belong to that user.

16. DATABASE

Use Supabase PostgreSQL.

Initial tables:

profiles


folders


notes


note_versions


notifications


shared_notes


Potential future tables:

subscriptions


payments


user_settings


Do not create unnecessary tables.

17. ROW LEVEL SECURITY

Security is mandatory.

Every user-owned record must be protected with Row Level Security.

Users must only be able to access their own private data.

Do not expose another user's:

Notes


Folders


Profile data


Private information


Do not disable RLS merely to make development easier.

18. STATE MANAGEMENT

Use the simplest appropriate state management.

Use Zustand for genuinely global UI state such as:

Current user


Sidebar state


Current note


Search state


Theme


Command palette state


Use React local state for:

Forms


Modals


Temporary UI state


Inputs


Use Supabase/PostgreSQL as the source of truth for persistent application data.

Do not duplicate persistent database state unnecessarily inside Zustand.

19. DATA FLOW

Keep the initial data flow simple:

React Component
↓
Supabase
↓
PostgreSQL

Do not create unnecessary chains such as:

Component
↓
Hook
↓
Service
↓
Repository
↓
API
↓
Adapter
↓
Database

unless there is a genuine requirement.

20. SEARCH

Implement note search using PostgreSQL/Supabase.

Search should initially cover:

Note title


Note content


Debounce search input where appropriate.

Do not introduce Elasticsearch or another search engine in the initial version.

21. FAVORITES

Users should be able to mark notes as favorites.

Use:

is_favorite

to control favorite status.

The Favorites page should display the user's favorite notes according to the provided UI.

22. TRASH

Deleting a note should initially use soft deletion.

Use:

is_deleted

instead of immediately destroying the database record.

Users should be able to:

View trash


Restore notes


Permanently delete notes if that feature exists in the supplied design


23. NOTE HISTORY

Support note versions using:

note_versions

Users should eventually be able to:

View previous versions


Restore a previous version


Implement this according to the application's feature phase rather than trying to build everything simultaneously.

24. MARKDOWN / RICH EDITING

The application may support:

Markdown


Rich text


Code blocks


Formatting


Note history


Export


The editor UI must follow the supplied EchoNotes design.

Do not install a huge editor framework unless it is actually necessary.

25. EXPORT

Initial export formats:

Markdown


TXT


PDF export can be implemented later.

26. SHARING

Implement read-only note sharing when this feature is reached.

Users should be able to create a shareable link for a note.

Shared notes should not expose private application data beyond what is intentionally shared.

27. COMMAND PALETTE

Implement a command palette according to the supplied UI.

Potential actions:

Create note


Search


Open settings


Open favorites


Open trash


Navigate between pages


Other application commands


Use keyboard shortcuts where appropriate.

28. SETTINGS

Settings should follow the supplied UI exactly.

Potential settings include:

Profile


Appearance


Notifications


Account


Security


Preferences


Only implement settings that are part of the current product requirements/design.

29. PERFORMANCE

Keep performance practical.

Use:

Debounced search


Lazy loading where useful


Pagination when note volume becomes large


Efficient queries


Minimal unnecessary re-renders


Do not reload the entire dashboard after every small change.

Do not prematurely optimize.

30. OFFLINE SUPPORT

Do NOT attempt to build complete offline synchronization in the first implementation unless specifically requested as a separate phase.

The future architecture may become:

React
↓
IndexedDB
↓
Sync Layer
↓
Supabase

Future offline capabilities may include:

IndexedDB


Offline cache


Offline editing


Sync queue


Sync status


Conflict handling


These should be implemented later after the online product is stable.

31. FUTURE CROSS-DEVICE SYNCHRONIZATION

The long-term EchoNotes product should allow users to access their notes across:

Desktop


Android


iOS


The same account should provide access to the same notes.

Example:

User creates a note on phone.

↓

Note syncs to Supabase.

↓

User open EchoNotes on desktop.

↓

The same note appears.

The cloud database should therefore remain the central synchronized source of user notes.

32. FUTURE ECHOLINK / CLIPBOARD FEATURE

A future feature may allow users to connect their mobile device with their computer and synchronize clipboard text.

Example:

Phone:

Copy text.

↓

EchoNotes mobile application.

↓

Connected Windows computer.

↓

Windows clipboard receives the text.

And the reverse:

Windows:

Copy text.

↓

EchoNotes Windows companion.

↓

Connected mobile device.

↓

Mobile clipboard receives the text.

This functionality should NOT be implemented as a normal browser-only feature.

A future native mobile application and lightweight Windows companion/service may be required for reliable operating-system clipboard access.

Do not attempt to fake this functionality inside the web application.

Keep the architecture flexible enough to support it later.

33. DEVELOPMENT PROCESS

IMPORTANT:

DO NOT BUILD THE ENTIRE APPLICATION IN ONE SHOT.

Build EchoNotes in small, testable phases.

Before making major architectural changes:

Inspect the existing project.

Understand the current implementation.

Preserve working code.

Implement one logical feature.

Test it.

Fix issues.

Continue to the next feature.

Do not rewrite working functionality unnecessarily.

34. DEVELOPMENT PHASES

PHASE 1 — FOUNDATION

Build:

React/Vite foundation


Tailwind


Routing


Supabase configuration


Zustand where necessary


Global styles


Theme


Main application layout


Sidebar


Navigation


Most importantly:

Reproduce the supplied UI first.

Do not start adding random features before the foundation visually matches the design.

PHASE 2 — AUTHENTICATION

Build:

Signup


Login


Forgot password


Email verification


Auth protection


Profile


Logout


All authentication screens must match the supplied UI.

PHASE 3 — NOTES

Build:

Dashboard


Note list


Create note


Open note


Edit note


Delete note


Favorite


Save


Auto-save


The note editor must match the supplied design.

PHASE 4 — ORGANIZATION

Build:

Folders


Move notes


Search


Favorites


Trash


PHASE 5 — ADVANCED NOTES

Build:

Markdown


Rich editing


Code blocks


History


Version restore


Export


PHASE 6 — PRODUCT FEATURES

Build:

Sharing


Notifications


Command palette


Keyboard shortcuts


Settings


Help


PHASE 7 — BILLING

Only after the core application is stable:

Free plan


Pro plan


Subscription


Payment


Usage limits


Do not build payment infrastructure before the core product works.

PHASE 8 — OFFLINE

Only after the online application is stable:

IndexedDB


Offline cache


Offline editor


Sync queue


Sync status


Conflict handling


35. IMPORTANT LOVABLE BEHAVIOR

When I provide an image/reference for a page, treat that image as the authoritative visual specification for that page.

Your job is to translate the visual design into functional React components.

Do not ask:

"What design should I use?"

The design has already been provided.

Instead:

Study the design → identify the layout → identify the typography → identify spacing → identify colors → identify components → implement it accurately.

If you need to make a decision that is not visible in the design, choose the simplest implementation that preserves the visual language.

36. DESIGN QUALITY CHECK

After implementing a page, visually inspect it against the supplied UI.

Check:

Is the layout aligned?


Is the sidebar the correct width?


Are elements positioned correctly?


Are the font sizes correct?


Is the font family correct?


Are font weights correct?


Are spacing and padding correct?


Are buttons the correct size?


Are icons correctly sized?


Are borders correct?


Are corner radii correct?


Are colors correct?


Does the page have the same visual hierarchy?


Does the page have the same density?


Does it look like the supplied design?


If not, refine the implementation.

Do not consider the page finished merely because the functionality works.

Visual accuracy is part of correctness.

37. FINAL PRINCIPLE

EchoNotes should be:

Simple code.
Strong product.
Accurate UI.
Fast experience.
Secure data.
Clear architecture.

The most important priorities are:

Match the supplied UI.

Make the core note-taking experience work.

Keep the architecture simple.

Use Supabase correctly.

Protect user data with RLS.

Build in small phases.

Do not over-engineer.

Do not redesign the supplied UI.

Do not build everything at once.

Preserve the architecture for future mobile, PWA, offline sync, and EchoLink capabilities.
 
ask any questions before proceeding

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03793aee-26d8-4e29-94b5-3d2e6cde486b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
