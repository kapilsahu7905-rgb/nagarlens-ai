# NagarLens AI — Vibe2Ship Project Description

## 1. Problem Statement Selected

Community Hero — Hyperlocal Problem Solver

## 2. Solution Overview

NagarLens AI is an AI-powered civic participation platform that helps citizens report, verify, track and resolve local infrastructure issues. A user uploads a photo and location; Gemini validates the evidence, categorizes the issue, estimates severity, suggests the responsible department and generates an actionable complaint draft. The community can verify reports, track progress and compare before/after resolution evidence.

## 3. Key Features

- Gemini multimodal issue analysis
- Structured issue categorization and routing
- Interactive issue map
- Community confirmation, dispute and duplicate signals
- Withdrawal of community responses
- AI-generated follow-up
- Before/after resolution verification
- Photo GPS metadata extraction
- Dashboard and personal issue tracker
- Editable and public citizen profiles
- Nagar Hero XP, badges and local/district/India leaderboards
- Firebase-backed multi-user persistence

## 4. Agentic Workflow

1. Validate evidence
2. Categorize issue
3. Estimate urgency
4. Route to a likely department
5. Generate complaint and actions
6. Detect potential duplicates
7. Track community verification
8. Generate follow-up
9. Verify resolution evidence
10. Update status, impact and XP

## 5. Technologies Used

- React
- TypeScript
- Node.js
- Express
- Zod
- Leaflet and React Leaflet
- OpenStreetMap
- exifr
- Firebase
- Vitest

## 6. Google Technologies Utilized

- Google AI Studio
- Gemini API
- Google Cloud deployment through AI Studio
- Firebase Authentication
- Cloud Firestore
- Firebase Storage

## 7. System Architecture

```text
Citizen Browser
   ↓
React + TypeScript UI
   ↓
Node/Express API
   ↓
Gemini structured multimodal analysis
   ↓
Firebase Auth + Firestore + Storage
   ↓
Community Board + Profiles + Nagar Hero
```

## 8. Reliability and Safety

- Automatic Gemini retry and model fallback
- Server-side API key
- Zod validation
- Rate limiting
- Image compression
- Conservative resolution verification
- No automatic government-submission claim
- No public display of email or private account data

## 9. Testing

Include:

- Automated test output
- Production build output
- Multi-browser Firebase test
- Screenshots of AI analysis
- Screenshot of community map
- Screenshot of public profile
- Screenshot of Nagar Hero leaderboard

## 10. Limitations

- Suggested department may not reflect exact local jurisdiction
- Authorities are not automatically contacted
- Image analysis may be uncertain
- Rankings depend on honest citizen participation and database rules

## 11. Links

- Deployed Application:
- GitHub Repository:
- Demo Video:
