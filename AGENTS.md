# NagarLens AI Agent Instructions

## Product goal
Build a reliable, transparent civic issue workflow for Vibe2Ship 2026. Google AI Studio and Gemini must remain core to image analysis, routing, follow-up planning and resolution verification.

## Priorities
1. A working end-to-end flow: photo → Gemini analysis → publish → verify → follow up → resolution check.
2. Secure server-side Gemini usage; never expose `GEMINI_API_KEY` in client code.
3. Honest status communication; never claim a complaint was sent or an authority acted unless confirmed.
4. Mobile accessibility and graceful error states.
5. Small, reviewable changes with tests.

## Engineering rules
- Read `README.md` and `docs/ARCHITECTURE.md` before major changes.
- Plan before editing more than three files.
- Keep public enum values stable because Firestore documents depend on them.
- Do not remove local-storage fallback; it enables first-run testing.
- Keep demo output visibly labelled and set `DEMO_MODE=false` for judging.
- Run `npm run check` after significant changes.
- Never commit `.env` or credentials.
