# Agenda

Expo SDK 54 scaffold for a multi-screen agenda application.

## Structure

- `src/app`: route and navigation files only
- `src/features`: screen UI, state, and feature logic
- `src/components`: shared layout and UI primitives
- `src/native`: genuine platform-specific implementations

Route files re-export feature screens. Add shared state, persistence, native UI bindings, or platform forks only when a product requirement needs them.

## Run

```bash
npm install
npm start
```

The default start command targets Expo Go. Use `npm run web`, `npm run ios`, or `npm run android` for a specific platform.
