import assert from 'node:assert/strict';

const SMOKE_API_KEY = 'SMOKE_KEY_12345';
const SMOKE_SYMBOL = 'AAPL';

async function openSettings() {
  const settingsLink = await $('a=Settings');
  await settingsLink.waitForDisplayed({ timeout: 15_000 });
  await settingsLink.click();

  const settingsHeading = await $('h2=Settings');
  await settingsHeading.waitForDisplayed({ timeout: 15_000 });
}

async function openWatchlist() {
  const watchlistLink = await $('a=Watchlist');
  await watchlistLink.waitForDisplayed({ timeout: 15_000 });
  await watchlistLink.click();

  const watchlistHeading = await $('h2=Watchlist');
  await watchlistHeading.waitForDisplayed({ timeout: 15_000 });
}

async function clearWatchlist() {
  // Keep removing the first visible row until no symbols remain.
  // This makes the smoke run deterministic across persisted app state.
  while (true) {
    const removeButtons = await $$('button=Remove');
    if (removeButtons.length === 0) {
      break;
    }

    const firstRemove = removeButtons[0];
    await firstRemove.scrollIntoView();
    await firstRemove.waitForClickable({ timeout: 10_000 });
    await firstRemove.click();

    await browser.waitUntil(async () => {
      const remainingButtons = await $$('button=Remove');
      return remainingButtons.length < removeButtons.length;
    }, {
      timeout: 10_000,
      timeoutMsg: 'Expected watchlist item to be removed.',
    });
  }
}

describe('Desktop smoke', () => {
  it('launches the app shell', async () => {
    const watchlistHeading = await $('h2=Watchlist');
    await watchlistHeading.waitForDisplayed({ timeout: 20_000 });
  });

  it('can save settings and clear cache', async () => {
    await openSettings();

    const apiKeyInput = await $('input[placeholder="Enter Twelve Data API key"]');
    await apiKeyInput.waitForDisplayed({ timeout: 10_000 });
    await apiKeyInput.setValue(SMOKE_API_KEY);

    const saveButton = await $('button=Save Settings');
    await saveButton.click();
    const saveSuccess = await $('p=Settings saved.');
    await saveSuccess.waitForDisplayed({ timeout: 20_000 });

    const clearCacheButton = await $('button=Reset Cache');
    await clearCacheButton.click();
    const clearSuccess = await $('p=Cache cleared.');
    await clearSuccess.waitForDisplayed({ timeout: 10_000 });
  });

  it('supports watchlist and chart interactions', async () => {
    await openWatchlist();
    await clearWatchlist();

    const symbolInput = await $('input[placeholder="Add symbol (e.g. AAPL)"]');
    await symbolInput.waitForDisplayed({ timeout: 10_000 });
    await symbolInput.clearValue();
    await symbolInput.setValue(SMOKE_SYMBOL);

    const addButton = await $('button=Add');
    await addButton.click();

    const symbolCard = await $(
      `//div[.//strong[normalize-space()="${SMOKE_SYMBOL}"] and .//button[normalize-space()="View Chart"]]`
    );
    await symbolCard.waitForDisplayed({ timeout: 20_000 });

    const viewChartButton = await symbolCard.$('button=View Chart');
    await viewChartButton.scrollIntoView();
    await viewChartButton.waitForClickable({ timeout: 20_000 });
    await viewChartButton.click();

    const chartHeading = await $('h2=Performance Chart');
    await chartHeading.waitForDisplayed({ timeout: 10_000 });

    const selectedSymbol = await $(`strong=${SMOKE_SYMBOL}`);
    await selectedSymbol.waitForDisplayed({ timeout: 10_000 });

    const rangeSelect = await $('select');
    await rangeSelect.selectByVisibleText('1W');
    await browser.waitUntil(async () => (await rangeSelect.getValue()) === '1W', {
      timeout: 10_000,
      timeoutMsg: 'Expected chart range to switch to 1W.',
    });

    const refreshChartButton = await $('button=Refresh Chart');
    await refreshChartButton.waitForDisplayed({ timeout: 10_000 });
    await refreshChartButton.click();

    const chartStillVisible = await $('h2=Performance Chart');
    assert.equal(await chartStillVisible.isDisplayed(), true);
  });
});
