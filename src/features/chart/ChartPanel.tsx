import React, { useEffect, useState } from 'react';
import { tauriClient } from '../../services/tauriClient';
import type { AppError, SymbolPerformance, TimeRange } from '../../types';

interface ChartPanelProps {
  selectedSymbol?: string | null;
}

const RANGE_OPTIONS: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

export const ChartPanel: React.FC<ChartPanelProps> = ({ selectedSymbol }) => {
  const [range, setRange] = useState<TimeRange>('1M');
  const [performance, setPerformance] = useState<SymbolPerformance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    tauriClient
      .getSettings()
      .then((settings) => {
        if (mounted) {
          setRange(settings.defaultRange);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSymbol) {
      setPerformance(null);
      setErrorMessage(null);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    tauriClient
      .getSymbolPerformance(selectedSymbol, range)
      .then((result) => {
        if (mounted) {
          setPerformance(result);
        }
      })
      .catch((rawError: AppError) => {
        if (mounted) {
          setPerformance(null);
          setErrorMessage(rawError.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedSymbol, range]);

  async function handleRefresh() {
    if (!selectedSymbol) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const result = await tauriClient.refreshSymbolPerformance(selectedSymbol, range);
      setPerformance(result);
    } catch (rawError) {
      const error = rawError as AppError;
      setErrorMessage(error.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  function buildSparklinePoints(points: SymbolPerformance['points']): string {
    if (points.length === 0) {
      return '';
    }

    const width = 760;
    const height = 220;
    const padding = 20;
    const min = Math.min(...points.map((point) => point.close));
    const max = Math.max(...points.map((point) => point.close));
    const xSpan = Math.max(points.length - 1, 1);
    const ySpan = Math.max(max - min, 1e-9);

    return points
      .map((point, index) => {
        const x = padding + (index / xSpan) * (width - padding * 2);
        const normalized = (point.close - min) / ySpan;
        const y = height - padding - normalized * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div data-testid="chart-panel" style={{ padding: '20px', borderLeft: '1px solid #ccc', minHeight: '100vh' }}>
      <h2 data-testid="chart-heading">Performance Chart</h2>
      {!selectedSymbol && <p>Select a symbol from your watchlist to view its performance.</p>}

      {selectedSymbol && (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
            <strong data-testid="chart-selected-symbol">{selectedSymbol}</strong>
            <select
              data-testid="chart-range-select"
              value={range}
              onChange={(event) => setRange(event.target.value as TimeRange)}
            >
              {RANGE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="chart-refresh-button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Chart'}
            </button>
          </div>

          {errorMessage && <p style={{ color: '#b71c1c' }}>{errorMessage}</p>}
          {isLoading && <p>Loading chart...</p>}

          {!isLoading && performance && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ color: performance.status === 'stale' ? '#ef6c00' : '#1b5e20' }}>
                Status: {performance.status}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                <div>Start: {performance.start.toFixed(2)}</div>
                <div>End: {performance.end.toFixed(2)}</div>
                <div>Min: {performance.min.toFixed(2)}</div>
                <div>Max: {performance.max.toFixed(2)}</div>
              </div>
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                <svg
                  viewBox="0 0 760 220"
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: '220px', display: 'block' }}
                >
                  <polyline
                    fill="none"
                    stroke="#0d47a1"
                    strokeWidth="2.5"
                    points={buildSparklinePoints(performance.points)}
                  />
                </svg>
              </div>
              <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f7f7' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Timestamp</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.points.map((point) => (
                      <tr key={`${point.ts}-${point.close}`}>
                        <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>{point.ts}</td>
                        <td style={{ padding: '8px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                          {point.close.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
