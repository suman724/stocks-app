mod twelvedata;

pub use twelvedata::TwelveDataAdapter;

use crate::domain::{AppError, ProviderTestResult};
use async_trait::async_trait;

#[async_trait]
pub trait MarketDataProvider: Send + Sync {
    async fn test_connection(&self, api_key: &str) -> Result<ProviderTestResult, AppError>;
}
