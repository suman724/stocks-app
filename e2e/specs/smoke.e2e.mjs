import assert from 'node:assert/strict';

const SMOKE_API_KEY = 'SMOKE_KEY_12345';
const SMOKE_SYMBOL = 'AAPL';

function byTestId(id) {
  return $(`[data-testid="${id}"]`);
}

async function clickWhenReady(element) {
  await element.waitForExist({ timeout: 20_000 });
  await element.scrollIntoView();
  await element.waitForDisplayed({ timeout: 20_000 });
  await element.waitForEnabled({ timeout: 20_000 });
  try {
    await element.waitForClickable({ timeout: 20_000 });
    await element.click();
  } catch {
    await browser.execute((el) => {
      (el).click();
    }, element);
  }
}

async function openSettings() {
  const settingsLink = await byTestId('nav-settings-link');
  await clickWhenReady(settingsLink);

  const settingsHeading = await $('h2=Settings');
  await settingsHeading.waitForDisplayed({ timeout: 15_000 });
}

async function openWatchlist() {
  const watchlistLink = await byTestId('nav-watchlist-link');
  await clickWhenReady(watchlistLink);

  const watchlistHeading = await $('h2=Watchlist');
  await watchlistHeading.waitForDisplayed({ timeout: 15_000 });

  const loadingState = await byTestId('watchlist-loading');
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

    const firstRemove = removeButtons[0];
    await clickWhenReady(firstRemove);

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

    const apiKeyInput = await byTestId('settings-api-key-input');
    await apiKeyInput.waitForDisplayed({ timeout: 10_000 });
    await apiKeyInput.clearValue();
    await apiKeyInput.setValue(SMOKE_API_KEY);

    const saveButton = await byTestId('settings-save-button');
    await clickWhenReady(saveButton);
    const saveSuccess = await byTestId('settings-save-feedback');
    await saveSuccess.waitForDisplayed({ timeout: 20_000 });
    await browser.waitUntil(async () => (await saveSuccess.getText()).includes('Settings saved.'), {
      timeout: 20_000,
      timeoutMsg: 'Expected save feedback to confirm settings were saved.',
    });

    const clearCacheButton = await byTestId('settings-reset-cache-button');
    await clickWhenReady(clearCacheButton);
    const clearSuccess = await byTestId('settings-cache-feedback');
    await clearSuccess.waitForDisplayed({ timeout: 10_000 });
    await browser.waitUntil(async () => (await clearSuccess.getText()).includes('Cache cleared.'), {
      timeout: 10_000,
      timeoutMsg: 'Expected cache feedback to confirm cache clear.',
    });
  });

  it('supports watchlist and chart interactions', async () => {
    await openWatchlist();
    await clearWatchlist();

    const symbolInput = await byTestId('watchlist-symbol-input');
    await symbolInput.waitForDisplayed({ timeout: 10_000 });
    await symbolInput.clearValue();
    await symbolInput.setValue(SMOKE_SYMBOL);

    const addButton = await byTestId('watchlist-add-button');
    await clickWhenReady(addButton);

    const symbolCard = await byTestId(`watchlist-card-${SMOKE_SYMBOL}`);
    await symbolCard.waitForDisplayed({ timeout: 20_000 });

    const viewChartButton = await byTestId(`watchlist-view-chart-${SMOKE_SYMBOL}`);
    await clickWhenReady(viewChartButton);

    const chartHeading = await byTestId('chart-heading');
    await chartHeading.waitForDisplayed({ timeout: 10_000 });

    const selectedSymbol = await byTestId('chart-selected-symbol');
    await selectedSymbol.waitForDisplayed({ timeout: 10_000 });
    await browser.waitUntil(async () => (await selectedSymbol.getText()).includes(SMOKE_SYMBOL), {
      timeout: 10_000,
      timeoutMsg: 'Expected chart selected symbol to match watchlist selection.',
    });

    const rangeSelect = await byTestId('chart-range-select');
    await rangeSelect.selectByVisibleText('1W');
    await browser.waitUntil(async () => (await rangeSelect.getValue()) === '1W', {
      timeout: 10_000,
      timeoutMsg: 'Expected chart range to switch to 1W.',
    });

    const refreshChartButton = await byTestId('chart-refresh-button');
    await clickWhenReady(refreshChartButton);

    const chartStillVisible = await byTestId('chart-heading');
    assert.equal(await chartStillVisible.isDisplayed(), true);
  });
});
