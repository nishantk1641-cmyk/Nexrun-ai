# Nexrun AI

Vibe-coding platform. Frontend on Firebase Hosting, auth with Firebase Authentication, data in Firestore, AI through the callable Cloud Function `nexrunAI` (Gemini key kept in Secret Manager, never in the browser).

## 1. Firebase Authentication
Console > Build > Authentication > Get started > Sign-in method > enable **Email/Password**.

## 2. Firestore
Console > Build > Firestore Database > Create database (production mode). Rules are deployed from `firestore.rules`.

## 3. Firebase CLI
```
npm install -g firebase-tools
firebase login
firebase use nexrun-ai
```
Cloud Functions and Secret Manager need the **Blaze** (pay as you go) plan.

## 4. Gemini API key
Create a key at https://aistudio.google.com/app/apikey. Never paste it into any file in this project.

## 5. Secret Manager
```
firebase functions:secrets:set GEMINI_API_KEY
```
Paste the key when asked.

## 6. Deploy
```
cd functions && npm install && cd ..
firebase deploy --only functions,hosting
firebase deploy --only firestore:rules
```

## 7. Test the AI Builder
Open your Hosting URL, sign up, go to AI Builder, enter "Create a modern portfolio website for a web designer" and press Generate. The code appears in the editor and the preview opens.

## Troubleshooting
- **unauthenticated**: log out and log in again.
- **Missing or insufficient permissions**: run `firebase deploy --only firestore:rules` and create the Firestore database.
- **Secret not found / internal error**: re-run `firebase functions:secrets:set GEMINI_API_KEY`, redeploy functions, then check `firebase functions:log`.
- **Billing error on deploy**: upgrade the project to Blaze.
- **Please wait a few seconds**: free plan requests are spaced 8 seconds apart.
- **Gemini 404 / model error**: change `MODEL` in `functions/index.js` and redeploy.
- **Blank preview**: check your JavaScript for errors; the preview is sandboxed and cannot touch the app.

## Roadmap
Step 11 Gemini AI (this build) · Step 12 payments · Step 13 secure Pro gating. Plan status is only ever changed server side.
