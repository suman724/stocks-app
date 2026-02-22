use crate::domain::{AppError, BootstrapPayload};
use crate::observability::CommandSpan;
use crate::persistence::{SettingsStore, WatchlistStore};
use tauri::AppHandle;

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn get_app_bootstrap_data(app: AppHandle) -> Result<BootstrapPayload, AppError> {
    let span = CommandSpan::start("get_app_bootstrap_data", &[]);
    let result = (|| -> Result<BootstrapPayload, AppError> {
        let settings = SettingsStore::from_app(&app)?.load()?;
        let watchlist = WatchlistStore::from_app(&app)?.load()?;
        Ok(BootstrapPayload {
            settings,
            watchlist,
        })
    })();

    match result {
        Ok(payload) => {
            span.ok(&[("watchlist_len", payload.watchlist.len().to_string())]);
            Ok(payload)
        }
        Err(err) => {
            span.err(&err, &[]);
            Err(err)
        }
    }
}
