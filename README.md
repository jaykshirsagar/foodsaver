# FoodSaver

FoodSaver is a React Native + Expo application for reducing food waste by connecting sellers and users around nearby food listings.

The app includes:
- Firebase Authentication (email/password)
- Firestore realtime listings
- Role-based experience: vanzator, utilizator, admin
- Listing creation with optional photos
- Marketplace feed with ranking and details popup
- Persistent Buy flow using Firestore purchases

## Tech Stack

- React Native (Expo)
- TypeScript
- Firebase Auth + Firestore
- Expo Image Picker

## Roles

- vanzator: can create listings
- utilizator: can browse and buy
- admin: can browse, create, and delete listings

## Project Structure

- [App.tsx](App.tsx): app shell, responsive layout, tabs, screen composition
- [src/screens](src/screens): top-level screens (auth, market, add, admin, account)
- [src/features/marketplace](src/features/marketplace): marketplace UI blocks (feed, notifications, form)
- [src/services](src/services): Firebase and domain services
- [src/context](src/context): auth context and session wiring
- [src/types](src/types): shared TypeScript types
- [firestore.rules](firestore.rules): Firestore security rules

## Requirements

- Node.js 18+
- npm 9+
- Expo CLI (optional; npx works fine)
- A Firebase project with Auth + Firestore enabled

## Environment Variables

Create a local env file:

1. Copy [\.env.example](.env.example) to `.env`.
2. Fill in your Firebase keys.

Expected variables (example names):
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID

Important:
- `.env` is ignored by git.
- `.env.example` is tracked and safe to share.

## Installation

```bash
npm install
```

## Run the App

```bash
npm run start
```

Then open:
- Android emulator/device via Expo
- iOS simulator/device via Expo
- Web in browser

Shortcuts:

```bash
npm run android
npm run ios
npm run web
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication:
   - Sign-in method: Email/Password
3. Enable Cloud Firestore.
4. Add your web app config values into `.env`.
5. Publish Firestore rules from [firestore.rules](firestore.rules).
6. Enable Firestore TTL for automatic expiry cleanup:
  - Collection group: `listings`
  - TTL field: `expiresAt`

## Firestore Data Model

- users/{uid}
  - displayName
  - email
  - role
  - lat, lng
  - interests
- users/{uid}/purchases/{listingId}
  - listingId
  - title
  - ownerUid
  - owner
  - priceRon
  - mode
  - purchasedAt
- listings/{listingId}
  - ownerUid
  - owner
  - title
  - description
  - category
  - quantity
  - expiresInHours
  - expiresAt
  - mode
  - priceRon
  - lat, lng
  - imageUrls
  - createdAt

## Current Feature Notes

- Buy action is persisted in Firestore under user purchases.
- Purchased listings are filtered out from the marketplace for the current user.
- Product details open as a popup modal from the marketplace feed.
- Account tab shows your own listings and allows edit/delete.

## Scripts

- `npm run start`: start Expo dev server
- `npm run android`: open Android target
- `npm run ios`: open iOS target
- `npm run web`: run web target

## GitHub Pages Deployment (GitHub Actions)

This repository includes a workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

It will:
- run on push to `main` or `master`
- install dependencies
- build Expo web export to `dist`
- deploy to GitHub Pages

### Required GitHub settings

1. Go to repository `Settings` -> `Pages`.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### Required repository secrets

Go to `Settings` -> `Secrets and variables` -> `Actions` and add:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

After secrets are added, push to `main`/`master` and deployment starts automatically.

## Container Deployment (Recommended)

This repo now includes container files:
- [Dockerfile](Dockerfile)
- [nginx.conf](nginx.conf)
- [.dockerignore](.dockerignore)
- [.github/workflows/deploy-container.yml](.github/workflows/deploy-container.yml)

### Run locally with Docker

```bash
docker build \
  --build-arg EXPO_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg EXPO_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg EXPO_PUBLIC_FIREBASE_APP_ID=... \
  --build-arg EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=... \
  -t foodsaver:web .

docker run --rm -p 8080:80 foodsaver:web
```

Open `http://localhost:8080`.

### Automatic image publish with GitHub Actions

Workflow: [.github/workflows/deploy-container.yml](.github/workflows/deploy-container.yml)

On push to `main`/`master`, it builds and pushes image to GHCR:
- `ghcr.io/<owner>/<repo>:<branch>`
- `ghcr.io/<owner>/<repo>:<sha>`
- `ghcr.io/<owner>/<repo>:latest` (default branch only)

### Required GitHub secrets for container build

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Deploy the published container

After image is in GHCR, deploy it to any container host:
- Render
- Railway
- Fly.io
- Azure Container Apps
- DigitalOcean Apps

Use port `80` inside the container.

## Troubleshooting

### .env was committed by mistake

If `.env` was already tracked before updating `.gitignore`, remove it from git index:

```bash
git rm --cached .env
```

Then commit.

### Firestore permission errors

- Confirm your user is authenticated.
- Verify role values in user document are one of: vanzator, utilizator, admin.
- Ensure published rules match [firestore.rules](firestore.rules).

### Images do not appear

- Verify images are selected correctly in listing form.
- Ensure payload stays under Firestore document size limits.

## Security Notes

- Never commit real secrets to git.
- Keep `.env` local.
- Use `.env.example` only for placeholders.

## Next Improvements

- Add "My Purchases" section in account tab
- Add sold/reserved status lifecycle for listings
- Add order history and seller-side confirmations
- Add tests for services and role-based flows
