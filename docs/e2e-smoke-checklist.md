# Desktop E2E Smoke Checklist

Use this checklist for each internal build on both macOS and Windows.

Before running the manual checklist, run the automated smoke harness when supported on your platform:

```bash
make e2e-smoke
```

## Run Metadata

- Date:
- Build commit:
- Build artifact:
- Tester:
- Platform: `macOS` / `Windows`

## Smoke Scenarios

1. App launches to the main screen without crash.
2. Settings screen opens and existing values load.
3. API key can be saved and a provider connection test returns a user-visible result.
4. Watchlist add/remove works for valid symbols.
5. Quote refresh displays data for at least one symbol.
6. Chart screen loads data for selected symbol.
7. Chart range switching (`1D`, `1W`, `1M`, `3M`, `1Y`) updates state without crash.
8. App restart restores settings and watchlist from local persistence.

## Result Matrix

| Scenario | Pass/Fail | Notes |
| --- | --- | --- |
| Launch |  |  |
| Settings load/save/test |  |  |
| Watchlist add/remove |  |  |
| Quote refresh |  |  |
| Chart load |  |  |
| Chart range switch |  |  |
| Persistence after restart |  |  |

## Sign-Off

- Overall result: `PASS` / `FAIL`
- Blocking issues:
- Follow-up tickets:
