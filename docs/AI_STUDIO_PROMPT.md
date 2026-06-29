# Google AI Studio Build prompt

Build and deploy a full-stack web application named **NagarLens AI** for the Vibe2Ship problem statement **Community Hero — Hyperlocal Problem Solver**.

Use the supplied NagarLens AI source files as the implementation reference and preserve all working functionality.

## Product goal

Help citizens report, verify, track and resolve local civic issues such as potholes, water leakage, damaged streetlights, waste, open drains and damaged infrastructure.

## Required application sections

1. **Dashboard** — main home page with hero, user XP, badge, personal statistics, quick actions and the user’s own reported issues.
2. **Report an Issue** — dedicated top-level view. Do not render the form silently below the home page.
3. **Community Board** — filters, issue cards, interactive OpenStreetMap map, community verification and status tracking.
4. **Nagar Hero** — local, district and India leaderboards, XP progress and badge gallery.
5. **Profile** — editable name, about, city, district and state, plus XP, badge, impact and contribution history.

Add a three-line navigation drawer containing Dashboard, Report an Issue, Community Board, Nagar Hero and Profile.

## Gemini workflow

Gemini must run server-side and provide:

- Image-based civic issue validation
- Category, title, summary, severity and urgency
- Visible safety risks
- Suggested municipal department
- Recommended actions
- Copy-ready complaint draft
- Follow-up and escalation draft
- Before/after resolution comparison

Use structured JSON output and validate it with Zod.

Use:

- Primary model from `GEMINI_MODEL`
- Fallback model from `GEMINI_FALLBACK_MODEL`
- Retry with exponential-style delays for temporary 429/503 errors

Never expose the API key in frontend code.

## Community and data

Use Firebase Anonymous Authentication, Firestore and Storage for:

- Issues
- Verification state
- Profiles
- XP events
- Resolution images

Keep localStorage fallback for development.

## Nagar Hero rules

Award XP once per user, issue and action:

- +20 valid report
- +3 community validation
- +5 duplicate review
- +5 useful follow-up
- +20 resolution evidence
- +50 verified resolution
- +40 when the user’s own reported issue is resolved

Withdraw related XP when a user withdraws a verification or duplicate flag.

Badge thresholds:

- Civic Starter: 0
- Bronze: 100
- Silver: 300
- Gold: 700
- Platinum: 1500
- Diamond: 3000

## UX and safety

- Responsive desktop and mobile design
- Smooth navigation to the top of each section
- Functional buttons only
- Loading, empty, success and error states
- Public profiles must not expose email or private auth data
- Do not claim government integration or that a complaint was automatically sent
- Do not mark an issue resolved without visible evidence

## Deployment

Use Google AI Studio’s full-stack environment and publish through its Google Cloud deployment flow. Store secrets in the server-side secrets panel.
