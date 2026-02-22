use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum AppProvider {
    #[default]
    Twelvedata,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum TimeRange {
    #[serde(rename = "1D")]
    OneDay,
    #[serde(rename = "1W")]
    OneWeek,
    #[serde(rename = "1M")]
    #[default]
    OneMonth,
    #[serde(rename = "3M")]
    ThreeMonths,
    #[serde(rename = "1Y")]
    OneYear,
}

impl TimeRange {
    pub fn as_key(&self) -> &'static str {
        match self {
            TimeRange::OneDay => "1D",
            TimeRange::OneWeek => "1W",
            TimeRange::OneMonth => "1M",
            TimeRange::ThreeMonths => "3M",
            TimeRange::OneYear => "1Y",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WatchlistItem {
    pub symbol: String,
    pub display_name: Option<String>,
    pub pinned: Option<bool>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum QuoteStatus {
    Fresh,
    Stale,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QuoteSummary {
    pub symbol: String,
    pub price: f64,
    pub change_abs: Option<f64>,
    pub change_pct: Option<f64>,
    pub currency: Option<String>,
    pub last_updated_at: String,
    pub status: QuoteStatus,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PricePoint {
    pub ts: String,
    pub close: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SymbolPerformance {
    pub symbol: String,
    pub range: TimeRange,
    pub points: Vec<PricePoint>,
    pub min: f64,
    pub max: f64,
    pub start: f64,
    pub end: f64,
    pub last_updated_at: String,
    pub status: QuoteStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub provider: AppProvider,
    pub api_key: String,
    pub default_range: TimeRange,
    pub auto_refresh_seconds: u32,
    pub notifications_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: AppProvider::default(),
            api_key: String::new(),
            default_range: TimeRange::default(),
            auto_refresh_seconds: 60,
            notifications_enabled: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsInput {
    pub provider: AppProvider,
    pub api_key: String,
    pub default_range: TimeRange,
    pub auto_refresh_seconds: u32,
    pub notifications_enabled: bool,
}

impl From<AppSettings> for AppSettingsInput {
    fn from(settings: AppSettings) -> Self {
        Self {
            provider: settings.provider,
            api_key: settings.api_key,
            default_range: settings.default_range,
            auto_refresh_seconds: settings.auto_refresh_seconds,
            notifications_enabled: settings.notifications_enabled,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderTestResult {
    pub ok: bool,
    pub provider: AppProvider,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapPayload {
    pub settings: AppSettings,
    pub watchlist: Vec<WatchlistItem>,
}
