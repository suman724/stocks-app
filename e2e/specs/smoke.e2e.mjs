import assert from 'node:assert/strict';

const SMOKE_API_KEY = process.env.E2E_TWELVEDATA_API_KEY || 'SMOKE_KEY_12345';
const SMOKE_SYMBOL = 'AAPL';

function byTestId(id) {
  return `[data-testid="${id}"]`;
}

async function clickWhenReady(selector) {
  const element = await $(selector);
  await element.waitForExist({ timeout: 20_000 });
  const visibleElement = await $(selector);
  await visibleElement.scrollIntoView();
  await visibleElement.waitForDisplayed({ timeout: 20_000 });
  const enabledElement = await $(selector);
  await enabledElement.waitForEnabled({ timeout: 20_000 });
  try {
    const clickableElement = await $(selector);
    await clickableElement.waitForClickable({ timeout: 20_000 });
    await clickableElement.click();
  } catch {
    await browser.waitUntil(async () => {
      const existingElement = await $(selector);
      return existingElement.isExisting();
    }, {
      timeout: 5_000,
      timeoutMsg: `Expected element to exist before JS click fallback: ${selector}`,
    });
    await browser.execute((targetSelector) => {
      const target = document.querySelector(targetSelector);
      if (!target) {
        throw new Error(`Element missing for selector: ${targetSelector}`);
      }
      target.click();
    }, selector);
  }
}

async function openSettings() {
  await clickWhenReady(byTestId('nav-settings-link'));

  const settingsHeading = await $('h2=Settings');
  await settingsHeading.waitForDisplayed({ timeout: 15_000 });
}

async function openWatchlist() {
  await clickWhenReady(byTestId('nav-watchlist-link'));

  const watchlistHeading = await $('h2=Watchlist');
  await watchlistHeading.waitForDisplayed({ timeout: 15_000 });

  const loadingState = await $(byTestId('watchlist-loading'));
  if (await loadingState.isExisting()) {
    await loadingState.waitForDisplayed({ timeout: 20_000, reverse: true });
  }
}

async function clearWatchlist() {
  // Keep removing the first visible row until no symbols remain.
  // This makes the smoke run deterministic across persisted app state.
  while (true) {
    const removeButtons = await $$('[data-testid^="watchlist-remove-"]');
    if (removeButtons.length === 0) {
      break;
    }

    const firstRemoveSelector = await removeButtons[0].getAttribute('data-testid');
    await clickWhenReady(`[data-testid="${firstRemoveSelector}"]`);

    await browser.waitUntil(async () => {
      const remainingButtons = await $$('[data-testid^="watchlist-remove-"]');
      return remainingButtons.length < removeButtons.length;
    }, {
      timeout: 10_000,
      timeoutMsg: 'Expected watchlist item to be removed.',
    });
  }
}

describe('Desktop smoke', () => {
  before(async () => {
    try {
      await browser.setWindowSize(1400, 900);
    } catch {
      // Some WRY sessions do not support explicit window resize.
    }
  });

  it('launches the app shell', async () => {
    const watchlistHeading = await $('h2=Watchlist');
    await watchlistHeading.waitForDisplayed({ timeout: 20_000 });
  });

  it('can save settings and clear cache', async () => {
    await openSettings();

    const apiKeyInput = await $(byTestId('settings-api-key-input'));
    await apiKeyInput.waitForDisplayed({ timeout: 10_000 });
    await apiKeyInput.clearValue();
    await apiKeyInput.setValue(SMOKE_API_KEY);

    await clickWhenReady(byTestId('settings-save-button'));
    const saveSuccess = await $(byTestId('settings-save-feedback'));
    await saveSuccess.waitForDisplayed({ timeout: 20_000 });
    await browser.waitUntil(async () => (await saveSuccess.getText()).includes('Settings saved.'), {
      timeout: 20_000,
      timeoutMsg: 'Expected save feedback to confirm settings were saved.',
    });

    await clickWhenReady(byTestId('settings-reset-cache-button'));
    const clearSuccess = await $(byTestId('settings-cache-feedback'));
    await clearSuccess.waitForDisplayed({ timeout: 10_000 });
    await browser.waitUntil(async () => (await clearSuccess.getText()).includes('Cache cleared.'), {
      timeout: 10_000,
      timeoutMsg: 'Expected cache feedback to confirm cache clear.',
    });
  });

  it('supports watchlist and chart interactions', async () => {
    await openWatchlist();
    await clearWatchlist();

    const symbolInput = await $(byTestId('watchlist-symbol-input'));
    await symbolInput.waitForDisplayed({ timeout: 10_000 });
    await symbolInput.clearValue();
    await symbolInput.setValue(SMOKE_SYMBOL);

    await clickWhenReady(byTestId('watchlist-add-button'));

    const symbolCard = await $(byTestId(`watchlist-card-${SMOKE_SYMBOL}`));
    await symbolCard.waitForDisplayed({ timeout: 20_000 });

    await clickWhenReady(byTestId(`watchlist-view-chart-${SMOKE_SYMBOL}`));

    const chartHeading = await $(byTestId('chart-heading'));
    await chartHeading.waitForDisplayed({ timeout: 10_000 });

    const selectedSymbol = await $(byTestId('chart-selected-symbol'));
    await selectedSymbol.waitForDisplayed({ timeout: 10_000 });
    await browser.waitUntil(async () => (await selectedSymbol.getText()).includes(SMOKE_SYMBOL), {
      timeout: 10_000,
      timeoutMsg: 'Expected chart selected symbol to match watchlist selection.',
    });

    const rangeSelect = await $(byTestId('chart-range-select'));
    await rangeSelect.selectByVisibleText('1W');
    await browser.waitUntil(async () => (await rangeSelect.getValue()) === '1W', {
      timeout: 10_000,
      timeoutMsg: 'Expected chart range to switch to 1W.',
    });

    await clickWhenReady(byTestId('chart-refresh-button'));

    const chartStillVisible = await $(byTestId('chart-heading'));
    assert.equal(await chartStillVisible.isDisplayed(), true);
  });
});
