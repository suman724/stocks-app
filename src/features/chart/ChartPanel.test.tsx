import { describe, it, beforeEach, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ChartPanel } from './ChartPanel';
import { tauriClient } from '../../services/tauriClient';

vi.mock('../../services/tauriClient', () => ({
  tauriClient: {
    getSettings: vi.fn(),
    getSymbolPerformance: vi.fn(),
    refreshSymbolPerformance: vi.fn(),
  },
}));

const samplePerformance = {
  symbol: 'AAPL',
  range: '1M' as const,
  points: [
    { ts: '2026-02-20 10:00:00', close: 190 },
    { ts: '2026-02-21 10:00:00', close: 195 },
  ],
  min: 190,
  max: 195,
  start: 190,
  end: 195,
  lastUpdatedAt: '2026-02-21 10:00:00',
  status: 'fresh' as const,
};

describe('ChartPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tauriClient.getSettings).mockResolvedValue({
      provider: 'twelvedata',
      apiKey: 'valid-key-123',
      defaultRange: '1M',
      autoRefreshSeconds: 60,
      notificationsEnabled: false,
    });
    vi.mocked(tauriClient.getSymbolPerformance).mockResolvedValue(samplePerformance);
    vi.mocked(tauriClient.refreshSymbolPerformance).mockResolvedValue(samplePerformance);
  });

  it('loads chart data when selected symbol changes', async () => {
    render(<ChartPanel selectedSymbol="AAPL" />);

    await waitFor(() => {
      expect(tauriClient.getSymbolPerformance).toHaveBeenCalledWith('AAPL', '1M');
    });
    expect(await screen.findByText('Status: fresh')).toBeInTheDocument();
  });

  it('requests refresh with selected range', async () => {
    render(<ChartPanel selectedSymbol="AAPL" />);
    await waitFor(() => {
      expect(tauriClient.getSymbolPerformance).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByDisplayValue('1M'), { target: { value: '1W' } });
    await waitFor(() => {
      expect(tauriClient.getSymbolPerformance).toHaveBeenLastCalledWith('AAPL', '1W');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Chart' }));
    await waitFor(() => {
      expect(tauriClient.refreshSymbolPerformance).toHaveBeenCalledWith('AAPL', '1W');
    });
  });
});

