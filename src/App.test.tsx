import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';

vi.mock('./features/watchlist/WatchlistScreen', () => ({
  WatchlistScreen: () => <div>Watchlist Screen</div>,
}));

vi.mock('./features/chart/ChartPanel', () => ({
  ChartPanel: () => <div>Chart Panel</div>,
}));

vi.mock('./features/settings/SettingsScreen', () => ({
  SettingsScreen: () => <div>Settings Screen</div>,
}));

describe('App', () => {
  it('renders Watchlist and Settings links', () => {
    render(<App />);
    expect(screen.getAllByText('Watchlist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });
});
