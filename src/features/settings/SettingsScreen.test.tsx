import { describe, it, beforeEach, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SettingsScreen } from './SettingsScreen';
import { tauriClient } from '../../services/tauriClient';

vi.mock('../../services/tauriClient', () => ({
  tauriClient: {
    getAppVersion: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    testProviderConnection: vi.fn(),
    getWatchlist: vi.fn(),
  },
}));

const sampleSettings = {
  provider: 'twelvedata' as const,
  apiKey: 'valid-key-123',
  defaultRange: '1M' as const,
  autoRefreshSeconds: 60,
  notificationsEnabled: false,
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tauriClient.getSettings).mockResolvedValue(sampleSettings);
    vi.mocked(tauriClient.getAppVersion).mockResolvedValue('0.1.0');
    vi.mocked(tauriClient.saveSettings).mockResolvedValue(sampleSettings);
    vi.mocked(tauriClient.testProviderConnection).mockResolvedValue({
      ok: true,
      provider: 'twelvedata',
      message: 'Connection successful.',
    });
  });

  it('loads and displays persisted settings', async () => {
    render(<SettingsScreen />);

    expect(await screen.findByDisplayValue('valid-key-123')).toBeInTheDocument();
    expect(await screen.findByText('App Version: 0.1.0')).toBeInTheDocument();
  });

  it('prevents save with an empty api key', async () => {
    render(<SettingsScreen />);

    const apiKeyInput = await screen.findByPlaceholderText('Enter Twelve Data API key');
    fireEvent.change(apiKeyInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    expect(screen.getByText('API key is required.')).toBeInTheDocument();
    expect(tauriClient.saveSettings).not.toHaveBeenCalled();
  });

  it('saves settings when input is valid', async () => {
    render(<SettingsScreen />);

    const apiKeyInput = await screen.findByPlaceholderText('Enter Twelve Data API key');
    fireEvent.change(apiKeyInput, { target: { value: 'valid-key-999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(tauriClient.saveSettings).toHaveBeenCalledWith({
        ...sampleSettings,
        apiKey: 'valid-key-999',
      });
    });
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
  });
});
