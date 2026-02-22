export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

export type QuoteStatus = 'fresh' | 'stale' | 'error';

export type AppProvider = 'twelvedata';

export interface WatchlistItem {
  symbol: string;
  displayName?: string;
  pinned?: boolean;
}

export interface QuoteSummary {
  symbol: string;
  price: number;
  changeAbs?: number;
  changePct?: number;
  currency?: string;
  lastUpdatedAt: string;
  status: QuoteStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface PricePoint {
  ts: string;
  close: number;
}

export interface SymbolPerformance {
  symbol: string;
  range: TimeRange;
  points: PricePoint[];
  min: number;
  max: number;
  start: number;
  end: number;
  lastUpdatedAt: string;
  status: QuoteStatus;
}

export interface AppSettings {
  provider: AppProvider;
  apiKey: string;
  defaultRange: TimeRange;
  autoRefreshSeconds: number;
  notificationsEnabled: boolean;
}
