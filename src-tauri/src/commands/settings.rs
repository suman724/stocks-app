use crate::domain::{AppError, AppSettings, AppSettingsInput, ProviderTestResult};
use crate::http::build_http_client;
use crate::observability::CommandSpan;
use crate::persistence::SettingsStore;
use crate::provider::{MarketDataProvider, TwelveDataAdapter};
use tauri::AppHandle;

const PROVIDER_TEST_TIMEOUT_SECONDS: u64 = 8;

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    let span = CommandSpan::start("get_settings", &[]);
    let result = SettingsStore::from_app(&app).and_then(|store| store.load());
    match result {
        Ok(settings) => {
            span.ok(&[]);
            Ok(settings)
        }
        Err(err) => {
            span.err(&err, &[]);
            Err(err)
        }
    }
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettingsInput) -> Result<AppSettings, AppError> {
    let span = CommandSpan::start("save_settings", &[]);
    let result = SettingsStore::from_app(&app).and_then(|store| store.save(settings));
    match result {
        Ok(saved) => {
            span.ok(&[
                ("provider", format!("{:?}", saved.provider)),
                (
                    "auto_refresh_seconds",
                    saved.auto_refresh_seconds.to_string(),
                ),
            ]);
            Ok(saved)
        }
        Err(err) => {
            span.err(&err, &[]);
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn test_provider_connection(app: AppHandle) -> Result<ProviderTestResult, AppError> {
    let span = CommandSpan::start("test_provider_connection", &[]);
    let result = async {
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
    .await;

    match result {
        Ok(response) => {
            span.ok(&[("ok", response.ok.to_string())]);
            Ok(response)
        }
        Err(err) => {
            span.err(&err, &[]);
            Err(err)
        }
    }
}
