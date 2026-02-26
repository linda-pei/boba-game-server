# Things in Rings - Game Server

A multiplayer web game built with React, TypeScript, and Firebase.

## Prerequisites

- Node.js v20+
- A Firebase project with **Anonymous Authentication** enabled

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure Firebase:**

   Copy the example env file and fill in your Firebase project credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values from the Firebase console (Project Settings > General > Your apps > Web app):

   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. **Enable Anonymous Auth in Firebase:**

   Go to the Firebase console > Authentication > Sign-in method > Add provider > Anonymous > Enable.

## Running

Start the dev server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser. You should see a green "Firebase connected" message with a uid if everything is configured correctly.

## Building for Production

```bash
npm run build
npm run preview
```
