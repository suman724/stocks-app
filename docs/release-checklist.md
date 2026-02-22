# Release Checklist

Use this checklist before promoting an internal build.

## Build and Artifact Checks

1. CI green for:
- Frontend lint/tests
- Backend format/clippy/tests
- Desktop artifact builds (macOS + Windows)
2. Artifacts uploaded and downloadable from CI.
3. App version updated intentionally.

## Quality Gates

1. Desktop E2E smoke checklist completed on macOS.
2. Desktop E2E smoke checklist completed on Windows.
3. Manual QA checklist completed for:
- invalid key path
- offline path
- rate-limit path
- cache fallback path

## Security and Observability

1. No secrets in logs (API key redaction validated).
2. Structured command logs available with duration and status.
3. Settings persistence and cache clear command validated.

## Release Decision

- Release candidate: `GO` / `NO-GO`
- Approver:
- Date:
- Notes:
