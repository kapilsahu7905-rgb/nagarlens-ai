# Start Here — NagarLens AI Final

## 1. Install

Windows:

```cmd
npm install
copy .env.example .env
```

Ubuntu/macOS:

```bash
npm install
cp .env.example .env
```

## 2. Configure Gemini

Add your real key privately in `.env`:

```env
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
DEMO_MODE=false
```

## 3. Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## 4. Test this sequence

1. Dashboard opens at the top.
2. Hamburger menu opens Profile, Dashboard, Nagar Hero and Community Board.
3. Start a report opens a dedicated report page without hidden scrolling.
4. Upload a photo and test photo GPS metadata.
5. Analyse with Gemini and publish.
6. Check the map marker and issue details.
7. Test confirm/dispute withdrawal and duplicate toggle.
8. Upload resolution evidence.
9. Check XP, badge progress, profile and leaderboard.
10. Test a reporter’s public profile.

## 5. Before submission

- Configure Firebase using `docs/DEPLOYMENT.md`.
- Set `DEMO_MODE=false`.
- Run `npm run check`.
- Run `npm audit --omit=dev`.
- Publish through Google AI Studio to Google Cloud.
- Test the public link in incognito mode.

## Never do this

- Do not paste your real API key into source code or chat.
- Do not commit `.env`.
- Do not use fake government integration claims.
- Do not award XP for repeated or withdrawn actions.
