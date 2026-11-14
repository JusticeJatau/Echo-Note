# EchoNotes

### Your thoughts. Everywhere. Anytime.

EchoNotes is a modern, offline-first note-taking application developed under the **Echo8V** ecosystem. It is designed to provide a seamless note-taking experience across devices, allowing users to create, manage, and access their notes whether they're online or offline.

With dedicated web and mobile applications, EchoNotes makes it easier to keep your ideas accessible across different platforms.

Built with a focus on simplicity, accessibility, and reliable data synchronization, EchoNotes keeps your ideas within reach.

## Features

- **Offline-First Experience:** Create and access notes without an active internet connection.
- **Cross-Device Synchronization:** Keep your notes synchronized across supported devices, including phones and desktops.
- **Multi-Platform Support:** Access EchoNotes through its web application and dedicated mobile application.
- **Local Data Persistence:** Uses IndexedDB on the web for local data storage.
- **Cloud Synchronization:** Powered by Supabase for cloud-backed data and synchronization.
- **Progressive Web App (PWA):** Installable web application with offline capabilities.
- **Native Mobile Application:** Built with React Native to provide a dedicated mobile experience.
- **Note Management:** Create, edit, organize, and manage your personal notes.
- **Responsive Interface:** Designed to work across different screen sizes.
- **Data Accessibility:** Access your notes whenever you need them, even with limited connectivity.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Web user interface |
| Vite | Web development and build tooling |
| JavaScript | Application logic |
| React Native | Native mobile application |
| IndexedDB | Web local data persistence |
| Supabase | Backend services and cloud synchronization |
| PWA | Web installability and offline support |

## Architecture

EchoNotes follows an offline-first, multi-platform architecture designed to provide a consistent note-taking experience across web and mobile devices.

### Web Application

- React powers the web user interface.
- Vite handles development and production builds.
- IndexedDB provides local data persistence.
- Supabase provides cloud-backed storage and synchronization.
- PWA functionality supports installation and offline access.

### Mobile Application

- React Native powers the native mobile experience.
- Supabase provides backend services and cloud synchronization.
- Local storage supports offline access and data persistence.

Both platforms are designed to work together, allowing users to access their notes across supported devices.