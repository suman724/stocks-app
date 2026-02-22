use crate::domain::{AppError, WatchlistItem};
use crate::persistence::WatchlistStore;
use tauri::AppHandle;

#[tauri::command]
pub fn get_watchlist(app: AppHandle) -> Result<Vec<WatchlistItem>, AppError> {
    WatchlistStore::from_app(&app)?.load()
}

