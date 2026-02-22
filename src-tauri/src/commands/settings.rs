use crate::domain::{AppError, AppSettings, AppSettingsInput, ProviderTestResult};
use crate::http::build_http_client;
use crate::persistence::SettingsStore;
use crate::provider::{MarketDataProvider, TwelveDataAdapter};
use tauri::AppHandle;

const PROVIDER_TEST_TIMEOUT_SECONDS: u64 = 8;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    SettingsStore::from_app(&app)?.load()
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettingsInput) -> Result<AppSettings, AppError> {
    SettingsStore::from_app(&app)?.save(settings)
}

#[tauri::command]
pub async fn test_provider_connection(app: AppHandle) -> Result<ProviderTestResult, AppError> {
    let settings = SettingsStore::from_app(&app)?.load()?;
    if settings.api_key.trim().is_empty() {
        return Err(AppError::validation(
            "invalid_settings",
            "Save an API key before testing provider connection.",
        ));
    }

    let client = build_http_client(PROVIDER_TEST_TIMEOUT_SECONDS)?;
    let provider = TwelveDataAdapter::new(client);
    provider.test_connection(&settings.api_key).await
}
