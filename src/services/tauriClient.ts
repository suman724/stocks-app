import { invoke } from '@tauri-apps/api/core';
import type {
  AppError,
  AppSettings,
  ProviderTestResult,
  QuoteSummary,
  WatchlistItem,
} from '../types';

function normalizeAppError(rawError: unknown): AppError {
  if (typeof rawError === 'object' && rawError !== null) {
    const maybeError = rawError as Record<string, unknown>;
    if (typeof maybeError.code === 'string' && typeof maybeError.message === 'string') {
      return { code: maybeError.code, message: maybeError.message };
    }

    if (typeof maybeError.error === 'string') {
      try {
        const nested = JSON.parse(maybeError.error);
        return normalizeAppError(nested);
      } catch {
        return { code: 'tauri_invoke_error', message: maybeError.error };
      }
    }
  }

  if (typeof rawError === 'string') {
    try {
      return normalizeAppError(JSON.parse(rawError));
    } catch {
      return { code: 'tauri_invoke_error', message: rawError };
    }
  }

  return { code: 'unknown_error', message: 'An unknown error occurred.' };
}

async function invokeWithError<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw normalizeAppError(error);
  }
}

export const tauriClient = {
  getAppVersion: async (): Promise<string> => {
    return await invokeWithError<string>('get_app_version');
  },

  getSettings: async (): Promise<AppSettings> => {
    return await invokeWithError<AppSettings>('get_settings');
  },

  saveSettings: async (settings: AppSettings): Promise<AppSettings> => {
    return await invokeWithError<AppSettings>('save_settings', { settings });
  },

  testProviderConnection: async (): Promise<ProviderTestResult> => {
    return await invokeWithError<ProviderTestResult>('test_provider_connection');
  },

  getWatchlist: async (): Promise<WatchlistItem[]> => {
    return await invokeWithError<WatchlistItem[]>('get_watchlist');
  },

  addSymbol: async (symbol: string): Promise<WatchlistItem[]> => {
    return await invokeWithError<WatchlistItem[]>('add_symbol', { symbol });
  },

  removeSymbol: async (symbol: string): Promise<WatchlistItem[]> => {
    return await invokeWithError<WatchlistItem[]>('remove_symbol', { symbol });
  },

  refreshWatchlistQuotes: async (): Promise<QuoteSummary[]> => {
    return await invokeWithError<QuoteSummary[]>('refresh_watchlist_quotes');
  },
};
