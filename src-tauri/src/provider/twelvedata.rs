use super::MarketDataProvider;
use crate::domain::{unix_timestamp_secs, AppError, AppProvider, ProviderTestResult, QuoteStatus, QuoteSummary};
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

    async fn fetch_quote(&self, symbol: &str, api_key: &str) -> Result<QuoteSummary, AppError> {
        let sanitized_key = api_key.trim();
        if sanitized_key.is_empty() {
            return Err(AppError::validation(
                "invalid_settings",
                "Save a valid API key before refreshing quotes.",
            ));
        }

        let response = self
            .client
            .get(format!("{}/quote", self.base_url))
            .query(&[("symbol", symbol), ("apikey", sanitized_key)])
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

        parse_quote_payload(symbol, payload)
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

fn parse_quote_payload(symbol: &str, payload: Value) -> Result<QuoteSummary, AppError> {
    let symbol_value = payload
        .get("symbol")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| symbol.to_string());

    let price = parse_number_field(&payload, &["close", "price", "last"])
        .ok_or_else(|| AppError::provider("provider_payload_invalid", "Quote payload missing price."))?;

    let change_abs = parse_number_field(&payload, &["change"]);
    let change_pct = parse_number_field(&payload, &["percent_change", "change_percent"]);
    let currency = payload
        .get("currency")
        .and_then(Value::as_str)
        .map(str::to_string);
    let last_updated_at = payload
        .get("datetime")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| unix_timestamp_secs().to_string());

    Ok(QuoteSummary {
        symbol: symbol_value,
        price,
        change_abs,
        change_pct,
        currency,
        last_updated_at,
        status: QuoteStatus::Fresh,
        error_code: None,
        error_message: None,
    })
}

fn parse_number_field(payload: &Value, keys: &[&str]) -> Option<f64> {
    keys.iter().find_map(|key| {
        let value = payload.get(*key)?;
        if let Some(as_num) = value.as_f64() {
            return Some(as_num);
        }

        let as_str = value.as_str()?;
        as_str.parse::<f64>().ok()
    })
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

    #[test]
    fn parse_quote_payload_maps_numeric_fields() {
        let payload = json!({
            "symbol": "AAPL",
            "close": "191.25",
            "change": "1.20",
            "percent_change": "0.63",
            "currency": "USD",
            "datetime": "2026-02-22 10:00:00"
        });

        let quote = parse_quote_payload("AAPL", payload).unwrap();
        assert_eq!(quote.symbol, "AAPL");
        assert_eq!(quote.price, 191.25);
        assert_eq!(quote.change_abs, Some(1.20));
        assert_eq!(quote.change_pct, Some(0.63));
        assert_eq!(quote.status, QuoteStatus::Fresh);
    }

    #[test]
    fn parse_quote_payload_requires_price() {
        let payload = json!({
            "symbol": "AAPL",
            "currency": "USD"
        });

        let result = parse_quote_payload("AAPL", payload);
        assert!(result.is_err());
    }
}
