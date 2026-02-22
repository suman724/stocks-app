mod errors;
mod models;

pub use errors::AppError;
pub use models::{
    AppProvider, AppSettings, AppSettingsInput, BootstrapPayload, ProviderTestResult, TimeRange,
    QuoteStatus, QuoteSummary, WatchlistItem,
};

const MIN_API_KEY_LEN: usize = 8;
const MIN_AUTO_REFRESH_SECONDS: u32 = 15;
const MAX_AUTO_REFRESH_SECONDS: u32 = 3600;
const MAX_SYMBOL_LEN: usize = 12;

pub fn validate_settings(input: AppSettingsInput) -> Result<AppSettings, AppError> {
    let api_key = input.api_key.trim().to_string();
    if api_key.is_empty() {
        return Err(AppError::validation(
            "invalid_settings",
            "API key is required.",
        ));
    }

    if api_key.len() < MIN_API_KEY_LEN {
        return Err(AppError::validation(
            "invalid_settings",
            "API key looks too short.",
        ));
    }

    if !(MIN_AUTO_REFRESH_SECONDS..=MAX_AUTO_REFRESH_SECONDS).contains(&input.auto_refresh_seconds)
    {
        return Err(AppError::validation(
            "invalid_settings",
            format!(
                "Auto refresh must be between {} and {} seconds.",
                MIN_AUTO_REFRESH_SECONDS, MAX_AUTO_REFRESH_SECONDS
            ),
        ));
    }

    Ok(AppSettings {
        provider: input.provider,
        api_key,
        default_range: input.default_range,
        auto_refresh_seconds: input.auto_refresh_seconds,
        notifications_enabled: input.notifications_enabled,
    })
}

pub fn normalize_symbol(input: &str) -> Result<String, AppError> {
    let normalized = input.trim().to_uppercase();
    if normalized.is_empty() {
        return Err(AppError::validation(
            "invalid_symbol",
            "Symbol cannot be empty.",
        ));
    }

    if normalized.len() > MAX_SYMBOL_LEN {
        return Err(AppError::validation(
            "invalid_symbol",
            "Symbol is too long.",
        ));
    }

    if !normalized
        .chars()
        .all(|ch| ch.is_ascii_uppercase() || ch.is_ascii_digit() || ch == '.' || ch == '-')
    {
        return Err(AppError::validation(
            "invalid_symbol",
            "Symbol contains invalid characters.",
        ));
    }

    Ok(normalized)
}

pub fn unix_timestamp_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_input(api_key: &str, auto_refresh_seconds: u32) -> AppSettingsInput {
        AppSettingsInput {
            provider: AppProvider::Twelvedata,
            api_key: api_key.to_string(),
            default_range: TimeRange::OneMonth,
            auto_refresh_seconds,
            notifications_enabled: true,
        }
    }

    #[test]
    fn validate_settings_rejects_empty_api_key() {
        let result = validate_settings(sample_input(" ", 60));
        assert!(result.is_err());
    }

    #[test]
    fn validate_settings_rejects_short_api_key() {
        let result = validate_settings(sample_input("abc123", 60));
        assert!(result.is_err());
    }

    #[test]
    fn validate_settings_rejects_invalid_refresh_interval() {
        let result = validate_settings(sample_input("valid-key-123", 5));
        assert!(result.is_err());
    }

    #[test]
    fn validate_settings_trims_and_accepts_valid_input() {
        let result = validate_settings(sample_input("  valid-key-123  ", 60));
        assert!(result.is_ok());
        assert_eq!(result.unwrap().api_key, "valid-key-123");
    }

    #[test]
    fn normalize_symbol_trims_and_upcases() {
        let symbol = normalize_symbol(" aapl ").unwrap();
        assert_eq!(symbol, "AAPL");
    }

    #[test]
    fn normalize_symbol_rejects_invalid_characters() {
        let result = normalize_symbol("AAPL$");
        assert!(result.is_err());
    }
}
