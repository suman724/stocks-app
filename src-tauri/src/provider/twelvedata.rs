use super::MarketDataProvider;
use crate::domain::{AppError, AppProvider, ProviderTestResult};
use async_trait::async_trait;
use reqwest::StatusCode;
use serde_json::Value;

const DEFAULT_BASE_URL: &str = "https://api.twelvedata.com";
const TEST_SYMBOL: &str = "AAPL";
const TEST_INTERVAL: &str = "1day";
const TEST_OUTPUT_SIZE: &str = "1";

#[derive(Debug, Clone)]
pub struct TwelveDataAdapter {
    client: reqwest::Client,
    base_url: String,
}

impl TwelveDataAdapter {
    pub fn new(client: reqwest::Client) -> Self {
        Self {
            client,
            base_url: DEFAULT_BASE_URL.to_string(),
        }
    }
}

#[async_trait]
impl MarketDataProvider for TwelveDataAdapter {
    async fn test_connection(&self, api_key: &str) -> Result<ProviderTestResult, AppError> {
        let sanitized_key = api_key.trim();
        if sanitized_key.is_empty() {
            return Err(AppError::validation(
                "invalid_settings",
                "Save a valid API key before testing connection.",
            ));
        }

        let response = self
            .client
            .get(format!("{}/time_series", self.base_url))
            .query(&[
                ("symbol", TEST_SYMBOL),
                ("interval", TEST_INTERVAL),
                ("outputsize", TEST_OUTPUT_SIZE),
                ("apikey", sanitized_key),
            ])
            .send()
            .await
            .map_err(map_transport_error)?;

        let status = response.status();
        let payload = response.json::<Value>().await.map_err(|err| {
            AppError::provider(
                "provider_payload_parse_failed",
                format!("Unable to parse provider response: {err}"),
            )
        })?;

        if !status.is_success() || payload_has_error_status(&payload) {
            return Err(map_provider_error(status, &payload));
        }

        Ok(ProviderTestResult {
            ok: true,
            provider: AppProvider::Twelvedata,
            message: "Connection successful.".to_string(),
        })
    }
}

fn payload_has_error_status(payload: &Value) -> bool {
    payload
        .get("status")
        .and_then(Value::as_str)
        .is_some_and(|status| status.eq_ignore_ascii_case("error"))
}

fn map_transport_error(err: reqwest::Error) -> AppError {
    if err.is_timeout() {
        return AppError::provider(
            "network_timeout",
            "Connection test timed out while contacting provider.",
        );
    }

    if err.is_connect() {
        return AppError::provider(
            "network_connect_error",
            "Unable to connect to provider. Check your network connection.",
        );
    }

    AppError::provider(
        "network_error",
        format!("Provider request failed: {err}"),
    )
}

fn map_provider_error(status: StatusCode, payload: &Value) -> AppError {
    let message = payload
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("Provider request failed.")
        .to_string();
    let message_lower = message.to_ascii_lowercase();

    let code = if status == StatusCode::UNAUTHORIZED
        || message_lower.contains("api key")
        || message_lower.contains("apikey")
    {
        "invalid_api_key"
    } else if status == StatusCode::TOO_MANY_REQUESTS
        || message_lower.contains("rate")
        || message_lower.contains("frequency")
        || message_lower.contains("limit")
    {
        "rate_limited"
    } else if message_lower.contains("symbol") {
        "invalid_symbol"
    } else {
        "provider_error"
    };

    AppError::provider(code, message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn map_provider_error_detects_invalid_key() {
        let payload = json!({ "status": "error", "message": "API key is incorrect." });
        let err = map_provider_error(StatusCode::BAD_REQUEST, &payload);
        assert_eq!(err.code, "invalid_api_key");
    }

    #[test]
    fn map_provider_error_detects_rate_limit() {
        let payload = json!({ "status": "error", "message": "API request frequency is too high." });
        let err = map_provider_error(StatusCode::TOO_MANY_REQUESTS, &payload);
        assert_eq!(err.code, "rate_limited");
    }

    #[test]
    fn map_provider_error_falls_back_to_generic_code() {
        let payload = json!({ "status": "error", "message": "Unexpected provider error." });
        let err = map_provider_error(StatusCode::BAD_GATEWAY, &payload);
        assert_eq!(err.code, "provider_error");
    }
}

