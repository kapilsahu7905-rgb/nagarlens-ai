# Architecture

```text
Citizen browser
  ├─ React + TypeScript interface
  ├─ Dashboard / Report / Community Board / Nagar Hero / Profile
  ├─ Leaflet + OpenStreetMap issue map
  ├─ EXIF GPS extraction with exifr
  ├─ Anonymous Firebase Authentication
  ├─ Firestore issue, profile, verification and XP records
  └─ Firebase Storage evidence images
          │
          ▼
Node.js / Express server-side runtime
  ├─ Rate limiting
  ├─ Request validation
  ├─ Gemini retry and fallback
  └─ Static production frontend
          │
          ▼
Gemini through @google/genai
  ├─ Civic issue validation and classification
  ├─ Severity, routing and complaint preparation
  ├─ Follow-up and escalation planning
  └─ Before/after resolution comparison
```

## Main data records

### Issue

Stores evidence, location, structured Gemini analysis, community signals, reporter identity, status and timeline.

### Profile

Stores public display details, XP, badge and contribution totals. It never exposes email or private authentication data.

### XP event

Uses a deterministic ID based on user, issue and action so the same action is not rewarded repeatedly. Withdrawn verification or duplicate actions remove the associated XP event.

### Verification

Stores one primary response per user (`confirm`, `dispute` or none) plus a separate duplicate toggle.

## AI reliability

The server retries temporary `429` and `503` failures. If the primary model remains unavailable, it tries the configured fallback model. Structured output is validated with Zod before the application uses it.

## AI boundaries

Gemini suggests categories, urgency, likely departments and action text. It does not submit government complaints, verify legal jurisdiction, identify people or claim that an authority completed work.

## Persistence modes

When Firebase environment variables are present, the app signs users in anonymously and stores shared records in Firestore and Storage. Without Firebase, the interface remains usable through localStorage with sample community data.

## Duplicate detection

The browser checks open reports in the same category within a configured geographic radius using a transparent distance calculation. This complements community duplicate flags.
