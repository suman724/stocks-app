import { describe, it, beforeEach, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WatchlistScreen } from './WatchlistScreen';
import { tauriClient } from '../../services/tauriClient';

vi.mock('../../services/tauriClient', () => ({
  tauriClient: {
    getAppVersion: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    testProviderConnection: vi.fn(),
    getWatchlist: vi.fn(),
    addSymbol: vi.fn(),
    removeSymbol: vi.fn(),
    refreshWatchlistQuotes: vi.fn(),
  },
}));

describe('WatchlistScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tauriClient.getSettings).mockResolvedValue({
      provider: 'twelvedata',
      apiKey: '',
      defaultRange: '1M',
      autoRefreshSeconds: 60,
      notificationsEnabled: false,
    });
    vi.mocked(tauriClient.getWatchlist).mockResolvedValue([]);
    vi.mocked(tauriClient.addSymbol).mockResolvedValue([{ symbol: 'AAPL' }]);
    vi.mocked(tauriClient.refreshWatchlistQuotes).mockResolvedValue([]);
    vi.mocked(tauriClient.removeSymbol).mockResolvedValue([]);
  });

  it('renders empty watchlist state', async () => {
    render(<WatchlistScreen />);
    expect(await screen.findByText('No symbols yet. Add one to start tracking quotes.')).toBeInTheDocument();
  });

  it('adds symbol through tauri command', async () => {
    render(<WatchlistScreen />);
    const input = await screen.findByPlaceholderText('Add symbol (e.g. AAPL)');
    fireEvent.change(input, { target: { value: 'aapl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(tauriClient.addSymbol).toHaveBeenCalledWith('aapl');
    });
  });
});

