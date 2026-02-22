# Manual QA Checklist

Run this checklist after desktop smoke tests to validate resilience behaviors.

## Test Metadata

- Date:
- Build commit:
- Tester:
- Platform: `macOS` / `Windows`

## Resilience Scenarios

1. Invalid API key
- Enter an invalid key.
- Run provider connection test and refresh watchlist quotes.
- Expected: clear error in UI, no crash, no secret leaked in logs.

2. Offline mode
- Disable network.
- Refresh watchlist quotes and chart.
- Expected: stale cached data shown when available; otherwise controlled error state.

3. Rate-limit handling
- Simulate/trigger provider rate-limit response.
- Refresh quotes multiple times within TTL window.
- Expected: app remains responsive; stale/error statuses displayed intentionally.

4. Cache fallback
- Load data once online, then disconnect network.
- Refresh again.
- Expected: cached stale data is served and status is marked `stale`.

5. Larger watchlist behavior
- Add 10-20 symbols.
- Trigger refresh and navigate across views.
- Expected: no crashes, no severe UI stalls, command logs show successful completions.

## Logging Spot Check

- Verify command logs include: command name, duration, status.
- Verify logs do not include API keys.

## Sign-Off

- Overall result: `PASS` / `FAIL`
- Blocking issues:
- Follow-up tickets:
