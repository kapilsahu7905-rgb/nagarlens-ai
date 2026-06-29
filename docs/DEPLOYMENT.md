# Google AI Studio and Cloud deployment checklist

## 1. Prepare the local project

Run:

```bash
npm install
npm run check
npm audit --omit=dev
```

Confirm:

- Tests pass
- TypeScript build passes
- Production dependency audit shows zero known vulnerabilities
- `.env` is not committed
- `DEMO_MODE=false` for final use

## 2. Create the Google AI Studio app

1. Open Google AI Studio Build mode.
2. Create a full-stack Web App.
3. Paste the prompt from `docs/AI_STUDIO_PROMPT.md`.
4. Transfer the project source into the AI Studio workspace using the file editor/import workflow available to your account.
5. Preserve the React frontend and Node server separation.
6. Confirm preview builds before adding cloud services.

## 3. Configure server-side Gemini secrets

Add these only to server-side secrets/environment settings:

```text
GEMINI_API_KEY=your private key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
DEMO_MODE=false
```

Never put the Gemini key in a `VITE_` variable.

## 4. Configure Firebase

Enable:

- Authentication → Anonymous
- Cloud Firestore
- Firebase Storage

Add the public Firebase Web App configuration:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Apply:

- `firestore.rules`
- `storage.rules`

## 5. Test multi-user behavior

Use two separate incognito/private browser windows.

Check:

1. Window A creates a profile and publishes an issue.
2. Window B can see the issue on the board and map.
3. Window B can verify it only once and can withdraw the response.
4. Duplicate flag can be toggled.
5. Public reporter profile opens.
6. XP and badge progress update.
7. Resolution evidence updates the timeline without duplicate entries.
8. Nagar Hero rankings load.

## 6. Test AI reliability

- Analyse a new image.
- Generate a follow-up.
- Compare before and after images.
- Confirm temporary model errors retry automatically.
- Confirm fallback model is used when the primary model is unavailable.
- Confirm raw Gemini JSON errors are not shown to judges.

## 7. Publish through Google AI Studio

Use the Publish flow in Google AI Studio and deploy the app to Google Cloud.

After publishing:

- Open the public URL in incognito mode.
- Test mobile layout.
- Test every navigation item.
- Confirm no login to your personal Google account is required.
- Keep the service active during the full evaluation period.

## 8. Submission assets

Submit:

- Public deployed application URL
- Public GitHub repository
- Anyone-with-link Google Doc

The Google Doc should include the sections from `docs/PROJECT_DESCRIPTION_TEMPLATE.md`.
