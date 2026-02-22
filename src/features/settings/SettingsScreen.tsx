import React, { useEffect, useState } from 'react';
import { tauriClient } from '../../services/tauriClient';
import type { AppError, AppSettings, TimeRange } from '../../types';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'twelvedata',
  apiKey: '',
  defaultRange: '1M',
  autoRefreshSeconds: 60,
  notificationsEnabled: false,
};

const RANGE_OPTIONS: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];
const AUTO_REFRESH_OPTIONS = [30, 60, 300];

type Feedback = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AppSettings | null>(null);
  const [appVersion, setAppVersion] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<Feedback | null>(null);
  const [testFeedback, setTestFeedback] = useState<Feedback | null>(null);
  const [cacheFeedback, setCacheFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSettingsData() {
      setIsLoading(true);
      try {
        const [loadedSettings, version] = await Promise.all([
          tauriClient.getSettings(),
          tauriClient.getAppVersion(),
        ]);
        if (!mounted) {
          return;
        }

        setSettings(loadedSettings);
        setSavedSettings(loadedSettings);
        setAppVersion(version);
      } catch (rawError) {
        if (!mounted) {
          return;
        }

        const error = rawError as AppError;
        setSaveFeedback({
          kind: 'error',
          message: `Failed to load settings: ${error.message}`,
        });
        setAppVersion('Unavailable');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettingsData();
    return () => {
      mounted = false;
    };
  }, []);

  const isDirty = savedSettings !== null && JSON.stringify(settings) !== JSON.stringify(savedSettings);

  function validateSettingsInput(value: AppSettings): string | null {
    if (!value.apiKey.trim()) {
      return 'API key is required.';
    }

    if (value.apiKey.trim().length < 8) {
      return 'API key looks too short.';
    }

    if (value.autoRefreshSeconds < 15 || value.autoRefreshSeconds > 3600) {
      return 'Auto refresh must be between 15 and 3600 seconds.';
    }

    return null;
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaveFeedback(null);

    const validationError = validateSettingsInput(settings);
    if (validationError) {
      setSaveFeedback({ kind: 'error', message: validationError });
      return;
    }

    setIsSaving(true);
    try {
      const persisted = await tauriClient.saveSettings(settings);
      setSettings(persisted);
      setSavedSettings(persisted);
      setSaveFeedback({ kind: 'success', message: 'Settings saved.' });
    } catch (rawError) {
      const error = rawError as AppError;
      setSaveFeedback({ kind: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setTestFeedback(null);

    if (isDirty) {
      setTestFeedback({
        kind: 'info',
        message: 'Save settings before testing provider connection.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await tauriClient.testProviderConnection();
      setTestFeedback({
        kind: result.ok ? 'success' : 'error',
        message: result.message,
      });
    } catch (rawError) {
      const error = rawError as AppError;
      setTestFeedback({ kind: 'error', message: error.message });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleClearCache() {
    setCacheFeedback(null);
    setIsClearingCache(true);
    try {
      await tauriClient.clearCache();
      setCacheFeedback({ kind: 'success', message: 'Cache cleared.' });
    } catch (rawError) {
      const error = rawError as AppError;
      setCacheFeedback({ kind: 'error', message: error.message });
    } finally {
      setIsClearingCache(false);
    }
  }

  function feedbackColor(kind: Feedback['kind']): string {
    if (kind === 'success') {
      return '#1b5e20';
    }

    if (kind === 'info') {
      return '#0d47a1';
    }

    return '#b71c1c';
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Settings</h2>
      <p>Configure your API key and app preferences.</p>

      {isLoading ? (
        <p>Loading settings...</p>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: '520px', display: 'grid', gap: '14px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span>Provider</span>
            <select
              value={settings.provider}
              disabled
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  provider: event.target.value as AppSettings['provider'],
                }))
              }
            >
              <option value="twelvedata">Twelve Data</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span>API Key</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                data-testid="settings-api-key-input"
                value={settings.apiKey}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, apiKey: event.target.value }))
                }
                placeholder="Enter Twelve Data API key"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setShowApiKey((current) => !current)}>
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span>Default Chart Range</span>
            <select
              value={settings.defaultRange}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  defaultRange: event.target.value as TimeRange,
                }))
              }
            >
              {RANGE_OPTIONS.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span>Auto Refresh Interval</span>
            <select
              value={settings.autoRefreshSeconds}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  autoRefreshSeconds: Number(event.target.value),
                }))
              }
            >
              {AUTO_REFRESH_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds}s
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  notificationsEnabled: event.target.checked,
                }))
              }
            />
            Enable notifications
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" data-testid="settings-save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              data-testid="settings-test-connection-button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving || isDirty}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              data-testid="settings-reset-cache-button"
              onClick={handleClearCache}
              disabled={isClearingCache}
            >
              {isClearingCache ? 'Clearing...' : 'Reset Cache'}
            </button>
          </div>

          {saveFeedback && (
            <p
              data-testid="settings-save-feedback"
              style={{ margin: 0, color: feedbackColor(saveFeedback.kind) }}
            >
              {saveFeedback.message}
            </p>
          )}
          {testFeedback && (
            <p
              data-testid="settings-test-feedback"
              style={{ margin: 0, color: feedbackColor(testFeedback.kind) }}
            >
              {testFeedback.message}
            </p>
          )}
          {cacheFeedback && (
            <p
              data-testid="settings-cache-feedback"
              style={{ margin: 0, color: feedbackColor(cacheFeedback.kind) }}
            >
              {cacheFeedback.message}
            </p>
          )}
        </form>
      )}

      <div style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
        App Version: {appVersion}
      </div>
    </div>
  );
};
