mod errors;
mod models;

pub use errors::AppError;
pub use models::{
    AppProvider, AppSettings, AppSettingsInput, BootstrapPayload, ProviderTestResult, TimeRange,
    WatchlistItem,
};

const MIN_API_KEY_LEN: usize = 8;
const MIN_AUTO_REFRESH_SECONDS: u32 = 15;
const MAX_AUTO_REFRESH_SECONDS: u32 = 3600;

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
}
