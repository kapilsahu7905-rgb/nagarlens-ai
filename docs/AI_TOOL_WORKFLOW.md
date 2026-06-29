# Cursor, Copilot and Claude workflow

Google AI Studio remains the core build and deployment tool. Use the other tools as reviewers and implementation assistants.

## Cursor — primary coding editor

First prompt:

```text
Read README.md, AGENTS.md and docs/ARCHITECTURE.md. Do not edit yet.
Explain the current end-to-end workflow, identify incomplete configuration,
and create the smallest safe plan to get a real Gemini response and Firebase
shared storage working. Preserve the architecture and run npm run check after changes.
```

For a bug:

```text
Reproduce this exact issue before editing. Trace the failing path, identify the
root cause with evidence, make the smallest safe change, add or update a test,
and run npm run check. Do not modify unrelated UI.
```

## GitHub Copilot — tests and review

```text
Review this diff for exposed secrets, incorrect Gemini API usage, unvalidated
AI output, false success messages, Firebase security problems, accessibility
issues and missing error states. Classify findings by severity. Do not rewrite
working code for style alone.
```

## Claude — architecture and judge simulation

```text
Act as a strict Vibe2Ship judge. Score this repository for problem impact,
agentic depth, innovation, Google technology use, product experience,
technical implementation and completeness. Identify the three changes that
would most improve the score before submission. Be direct and evidence-based.
```

Do not let Cursor and Claude edit the same branch simultaneously.
