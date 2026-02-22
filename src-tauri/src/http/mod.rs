use crate::domain::AppError;
use std::time::Duration;

pub fn build_http_client(timeout_seconds: u64) -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_seconds))
        .build()
        .map_err(|err| {
            AppError::internal(
                "http_client_init_failed",
                format!("Failed to initialize HTTP client: {err}"),
            )
        })
}
