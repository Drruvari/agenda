# Agenda

Agenda is a local-first planner built with Expo SDK 57, React Native, Expo Router, and SQLite. It supports iOS, Android, and a static web build.

## Requirements

- Node.js 22.13 or newer
- npm
- Xcode for iOS builds
- Android Studio and an Android SDK for Android builds

This app uses native modules and must run in a development build, not Expo Go.

## Project structure

- `src/app`: Expo Router routes and navigation layouts
- `src/features`: screens, feature state, and feature-specific logic
- `src/components`: shared layout and UI primitives
- `src/data`: SQLite, repositories, migrations, queries, and settings storage
- `src/native`: platform-specific integrations
- `src/theme`: appearance, color, typography, spacing, and motion tokens
- `assets`: fonts, branding, and app images
- `plugins`: Expo config plugins

## Install and run

Install dependencies:

```bash
npm install
```

Create and launch a local development build. The first native build and every native dependency or config-plugin change requires one of these commands:

```bash
npm run ios
npm run android
```

After the development client is installed, start Metro for normal JavaScript and TypeScript changes:

```bash
npm start
```

Run the web app:

```bash
npm run web
```

## Quality checks

Run the complete local check:

```bash
npm run check
```

Or run checks separately:

```bash
npm run typecheck
npm run lint
npm run lint:fix
npm run test
npm run test:watch
npm run format:check
npm run format
npx expo-doctor
```

`npm run lint:fix` and `npm run format` modify files. The other commands above are read-only.

## Native project generation

The `ios` and `android` directories are generated and ignored by Git. Regenerate them after changing native dependencies, app configuration, or config plugins:

```bash
npx expo prebuild --clean
npm run ios
npm run android
```

`npx expo prebuild --clean` deletes and recreates both native directories. Commit app configuration and config-plugin changes, not generated native files.

## Production builds

Sign in and configure EAS once:

```bash
npx eas-cli login
npx eas-cli build:configure
```

Create builds using the profiles in `eas.json`:

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile production --platform all
```

Submit production builds:

```bash
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

Export the static web build to `dist`:

```bash
npx expo export --platform web
```

## Optional local cleanup

These directories are generated and can be recreated:

```bash
rm -rf .expo dist
rm -rf ios android
rm -rf node_modules && npm install
```

Only remove `ios` and `android` when you are ready to regenerate them with `npx expo prebuild --clean` or the platform run commands.
