use crate::domain::{AppError, BootstrapPayload};
use crate::persistence::{SettingsStore, WatchlistStore};
use tauri::AppHandle;

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn get_app_bootstrap_data(app: AppHandle) -> Result<BootstrapPayload, AppError> {
    let settings = SettingsStore::from_app(&app)?.load()?;
    let watchlist = WatchlistStore::from_app(&app)?.load()?;

    Ok(BootstrapPayload { settings, watchlist })
}
