# Testing checklist

## Automated

```bash
npm test
npm run build
npm audit --omit=dev
```

Expected at packaging time:

- 2 test files passed
- 5 tests passed
- TypeScript check passed
- Vite production build passed
- 0 production dependency vulnerabilities

## Manual functional test

1. Dashboard loads at the top.
2. Hamburger drawer opens and closes.
3. Every drawer section navigates directly to the top.
4. Profile can be edited.
5. Report form detects GPS metadata when present.
6. Current location can be used.
7. Gemini analysis succeeds.
8. Temporary Gemini failures retry and use fallback.
9. Report publishes to the community board.
10. Map marker opens the correct report.
11. Confirm and Cannot Confirm are mutually exclusive.
12. Clicking a selected verification again withdraws it.
13. Duplicate flag can be added and removed.
14. XP increases and decreases with contribution state.
15. Follow-up generation works.
16. Resolution evidence can be uploaded.
17. Resolution timeline entry is updated without duplicates.
18. Public reporter profile opens.
19. Local, district and India leaderboards load.
20. Mobile layout remains usable.

## Firebase cross-browser test

Use two incognito windows and verify reports, profiles and community signals are shared.
