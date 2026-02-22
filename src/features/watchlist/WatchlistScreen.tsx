import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { tauriClient } from '../../services/tauriClient';
import type { AppError, AppSettings, QuoteSummary, WatchlistItem } from '../../types';

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'twelvedata',
  apiKey: '',
  defaultRange: '1M',
  autoRefreshSeconds: 60,
  notificationsEnabled: false,
};

interface WatchlistScreenProps {
  selectedSymbol?: string | null;
  onSelectSymbol?: (symbol: string) => void;
}

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({
  selectedSymbol,
  onSelectSymbol,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const quotesBySymbol = useMemo(() => {
    return new Map(quotes.map((quote) => [quote.symbol, quote]));
  }, [quotes]);

  const refreshQuotes = useCallback(async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      const refreshedQuotes = await tauriClient.refreshWatchlistQuotes();
      setQuotes(refreshedQuotes);
    } catch (rawError) {
      const error = rawError as AppError;
      setFeedback(error.message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setFeedback(null);
      try {
        const [loadedWatchlist, loadedSettings] = await Promise.all([
          tauriClient.getWatchlist(),
          tauriClient.getSettings(),
        ]);

        if (!mounted) {
          return;
        }

        setWatchlist(loadedWatchlist);
        setSettings(loadedSettings);

        if (loadedWatchlist.length > 0 && loadedSettings.apiKey.trim()) {
          await refreshQuotes();
        } else {
          setQuotes([]);
        }
      } catch (rawError) {
        if (!mounted) {
          return;
        }

        const error = rawError as AppError;
        setFeedback(error.message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [refreshQuotes]);

  useEffect(() => {
    if (!settings.apiKey.trim() || watchlist.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      refreshQuotes();
    }, settings.autoRefreshSeconds * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshQuotes, settings.apiKey, settings.autoRefreshSeconds, watchlist.length]);

  async function handleAddSymbol(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!newSymbol.trim()) {
      setFeedback('Enter a symbol to add.');
      return;
    }

    try {
      const updated = await tauriClient.addSymbol(newSymbol);
      setWatchlist(updated);
      setNewSymbol('');
      const addedSymbol = newSymbol.trim().toUpperCase();
      onSelectSymbol?.(addedSymbol);

      if (settings.apiKey.trim()) {
        await refreshQuotes();
      }
    } catch (rawError) {
      const error = rawError as AppError;
      setFeedback(error.message);
    }
  }

  async function handleRemoveSymbol(symbol: string) {
    setFeedback(null);
    try {
      const updated = await tauriClient.removeSymbol(symbol);
      setWatchlist(updated);
      setQuotes((current) => current.filter((quote) => quote.symbol !== symbol));
      if (selectedSymbol === symbol && updated.length > 0) {
        onSelectSymbol?.(updated[0].symbol);
      }
    } catch (rawError) {
      const error = rawError as AppError;
      setFeedback(error.message);
    }
  }

  function formatPrice(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : '—';
  }

  function statusColor(status: QuoteSummary['status']): string {
    if (status === 'fresh') {
      return '#1b5e20';
    }
    if (status === 'stale') {
      return '#ef6c00';
    }
    return '#b71c1c';
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Watchlist</h2>
      <p>Track quote summaries for your symbols.</p>

      <form onSubmit={handleAddSymbol} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input
          type="text"
          data-testid="watchlist-symbol-input"
          value={newSymbol}
          onChange={(event) => setNewSymbol(event.target.value)}
          placeholder="Add symbol (e.g. AAPL)"
          style={{ minWidth: '180px' }}
        />
        <button type="submit" data-testid="watchlist-add-button">
          Add
        </button>
        <button
          type="button"
          data-testid="watchlist-refresh-button"
          onClick={refreshQuotes}
          disabled={isRefreshing || watchlist.length === 0}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </form>

      {feedback && (
        <p data-testid="watchlist-feedback" style={{ color: '#b71c1c' }}>
          {feedback}
        </p>
      )}
      {isLoading && <p data-testid="watchlist-loading">Loading watchlist...</p>}

      {!isLoading && watchlist.length === 0 && (
        <p data-testid="watchlist-empty" style={{ marginTop: '16px' }}>
          No symbols yet. Add one to start tracking quotes.
        </p>
      )}

      {!isLoading && watchlist.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {watchlist.map((item) => {
            const quote = quotesBySymbol.get(item.symbol);
            const quoteStatus = quote?.status ?? 'error';
            return (
              <div
                key={item.symbol}
                data-testid={`watchlist-card-${item.symbol}`}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.symbol}</strong>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      data-testid={`watchlist-view-chart-${item.symbol}`}
                      onClick={() => onSelectSymbol?.(item.symbol)}
                    >
                      View Chart
                    </button>
                    <button
                      type="button"
                      data-testid={`watchlist-remove-${item.symbol}`}
                      onClick={() => handleRemoveSymbol(item.symbol)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {selectedSymbol === item.symbol && <div style={{ color: '#0d47a1' }}>Selected</div>}
                <div>Price: {quote ? formatPrice(quote.price) : '—'}</div>
                <div>
                  Change: {quote?.changeAbs !== undefined ? quote.changeAbs.toFixed(2) : '—'} (
                  {quote?.changePct !== undefined ? quote.changePct.toFixed(2) : '—'}%)
                </div>
                <div style={{ color: statusColor(quoteStatus), fontWeight: 600 }}>
                  Status: {quoteStatus}
                  {quote?.errorMessage ? ` - ${quote.errorMessage}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
