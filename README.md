# NagarLens AI

**Report. Verify. Resolve. Earn impact.**

NagarLens AI is a full-stack Vibe2Ship 2026 project for the problem statement **Community Hero — Hyperlocal Problem Solver**. It converts a citizen’s photo and location into a structured civic report, gathers community verification, plans follow-ups, compares before/after evidence and rewards meaningful public participation through the **Nagar Hero** XP system.

## Disclaimer

The reports, issues, locations, usernames, profiles, leaderboard entries, and other community data currently visible in this project are created only for testing, demonstration, and hackathon judging purposes.

They do not represent real civic complaints, real people, real public authority records, or verified government reports. NagarLens AI is a prototype built to demonstrate how AI can help citizens report, verify, and track hyperlocal civic issues more efficiently.

## Final feature set

### AI civic workflow

- Gemini multimodal analysis of civic-issue photos
- Structured category, severity, urgency, department and complaint output
- Retry handling for temporary Gemini failures
- Automatic fallback from `gemini-3.5-flash` to `gemini-3.1-flash-lite`
- AI-generated follow-up and escalation drafts
- Before/after visual resolution verification
- Duplicate checking using category and location

### Community platform

- Dedicated Dashboard, Report, Community Board, Nagar Hero and Profile sections
- Hamburger navigation drawer and active-section highlighting
- Interactive OpenStreetMap/Leaflet issue map
- Community confirmation, dispute and duplicate toggles
- Withdrawal and XP rollback for changed contributions
- Public issue timelines and public contributor profiles
- Image GPS metadata extraction with user confirmation

### Nagar Hero gamification

- XP for reporting, validation, duplicate review, follow-ups and resolution evidence
- Local, district and India leaderboards
- Ranking by XP, reports, resolutions and community contribution
- Civic Starter, Bronze, Silver, Gold, Platinum and Diamond badges
- Badge progress bar and contribution history
- Anti-spam rules: deterministic XP events and one contribution per user/issue/action

### Profiles

- Editable display name, about, city, district and state
- XP, badge, impact, issues reported, issues resolved and contribution statistics
- Public profile view for any issue reporter or leaderboard member
- Personal dashboard with tracked reports

## Workflow

```text
Photo + description + location
        ↓
Gemini evidence validation
        ↓
Category, severity, urgency and department
        ↓
Publish to shared community board
        ↓
Map + verification + duplicate signals
        ↓
Follow-up planning and public status timeline
        ↓
Before/after resolution verification
        ↓
XP, badge progress and Nagar Hero ranking
```

## Technology stack

| Layer | Technology |
|---|---|
| Build and deployment | Google AI Studio Build mode → Cloud Run |
| AI | Gemini via official `@google/genai` SDK |
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express |
| Validation | Zod and Gemini structured output |
| Shared data | Firebase Anonymous Auth, Firestore and Storage |
| Mapping | Leaflet, React Leaflet and OpenStreetMap |
| Photo metadata | `exifr` |
| Testing | Vitest |

## Quick start

### Requirements

- Node.js 20 or newer
- Gemini API key from Google AI Studio
- Optional Firebase project for multi-user persistence

### Install

Windows Command Prompt:

```cmd
npm install
copy .env.example .env
```

Ubuntu/macOS:

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_actual_key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
DEMO_MODE=false
```

Run:

```bash
npm run dev
```

Open `http://localhost:5173`.

### Demo mode

For interface testing without an API key:

```env
DEMO_MODE=true
```

Demo AI results are visibly labelled. Set it back to `false` before submission.

## Firebase setup

The app works with local browser storage when Firebase is not configured. For the public hackathon version:

1. Create a Firebase project.
2. Enable **Authentication → Anonymous**.
3. Create **Cloud Firestore** and **Firebase Storage**.
4. Register a Web App.
5. Add the values below to `.env` or the AI Studio environment:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

6. Apply `firestore.rules` and `storage.rules`.
7. Test reports and profiles from two different private/incognito windows.

## Deployment

NagarLens AI is prepared for deployment through Google AI Studio and Cloud Run as required for the hackathon submission.

Live working app link :- https://nagarlens-ai-588308396609.asia-southeast1.run.app/

See `docs/DEPLOYMENT.md` for the complete checklist.

## Commands

```bash
npm run dev       # Vite frontend + Express API
npm test          # Automated tests
npm run build     # Type-check + production frontend build
npm run check     # Tests followed by build
npm start         # Serve production build and API
npm audit --omit=dev
```

## Security notes

- Never expose the Gemini API key in a `VITE_` variable.
- Never commit `.env`.
- Images are compressed before AI processing.
- API routes are rate-limited.
- XP events use deterministic IDs to reduce repeated rewards.
- Public profiles do not display email addresses or private authentication data.
- The included production dependency audit has zero known vulnerabilities at packaging time.

## Repository structure

```text
nagarlens-ai/
├── server/                         # Express and Gemini logic
├── src/
│   ├── components/                 # UI sections and dialogs
│   ├── communityRepository.ts      # Profiles, XP, badges and leaderboards
│   ├── repository.ts               # Issues, verification and images
│   ├── firestoreRest.ts            # Shared Firestore REST utilities
│   └── ...
├── docs/
├── firestore.rules
├── storage.rules
├── .env.example
└── README.md
```

## Submission checklist

- [ ] `DEMO_MODE=false`
- [ ] Real Gemini image analysis succeeds
- [ ] Automatic retry/fallback is working
- [ ] Firebase reports and profiles work across browsers
- [ ] Public Cloud Run link opens without your account
- [ ] Profile, public profile and Nagar Hero rankings work
- [ ] No API key is committed to GitHub
- [ ] Google Doc is shared with anyone who has the link
- [ ] All submission links are tested before the deadline

## Responsible-use limitation

NagarLens AI is a decision-support prototype. It does not represent a government body, dispatch workers, submit complaints automatically or guarantee that an issue has been resolved. Users and authorities should review evidence before taking action.

## License

MIT
