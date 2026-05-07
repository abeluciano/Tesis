# Tesis

## Prerequisites
- Node.js
- Flutter SDK
- PostgreSQL (Neon Database)

## Setup
1. Create a `.env` file at the root of the project with the following variables:
   - `DATABASE_URL` (Neon PostgreSQL connection string)
   - `JWT_SECRET` (Secret for JWT signing)

## Running the Backend
```bash
cd backend
npm install
npm start
```

## Running the Flutter App
```bash
cd app
flutter pub get
flutter run
```
