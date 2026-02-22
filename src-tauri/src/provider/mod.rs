mod twelvedata;

pub use twelvedata::TwelveDataAdapter;

use crate::domain::{AppError, ProviderTestResult, QuoteSummary, SymbolPerformance, TimeRange};
use async_trait::async_trait;

#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    async fn test_connection(&self, api_key: &str) -> Result<ProviderTestResult, AppError>;
    async fn fetch_quote(&self, symbol: &str, api_key: &str) -> Result<QuoteSummary, AppError>;
    async fn fetch_symbol_performance(
        &self,
        symbol: &str,
        range: TimeRange,
        api_key: &str,
    ) -> Result<SymbolPerformance, AppError>;
}
