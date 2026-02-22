use crate::domain::{normalize_symbol, AppError, WatchlistItem};
use crate::persistence::WatchlistStore;
use tauri::AppHandle;

#[tauri::command]
pub fn get_watchlist(app: AppHandle) -> Result<Vec<WatchlistItem>, AppError> {
    WatchlistStore::from_app(&app)?.load()
}

#[tauri::command]
pub fn add_symbol(app: AppHandle, symbol: String) -> Result<Vec<WatchlistItem>, AppError> {
    let normalized_symbol = normalize_symbol(&symbol)?;
    let store = WatchlistStore::from_app(&app)?;
    let mut watchlist = store.load()?;

    if watchlist.iter().any(|item| item.symbol == normalized_symbol) {
        return Err(AppError::validation(
            "symbol_exists",
            format!("{normalized_symbol} is already in your watchlist."),
        ));
    }

    watchlist.push(WatchlistItem {
        symbol: normalized_symbol,
        display_name: None,
        pinned: None,
    });

    store.save(&watchlist)
}

#[tauri::command]
pub fn remove_symbol(app: AppHandle, symbol: String) -> Result<Vec<WatchlistItem>, AppError> {
    let normalized_symbol = normalize_symbol(&symbol)?;
    let store = WatchlistStore::from_app(&app)?;
    let mut watchlist = store.load()?;
    let initial_len = watchlist.len();
    watchlist.retain(|item| item.symbol != normalized_symbol);

    if watchlist.len() == initial_len {
        return Err(AppError::validation(
            "symbol_not_found",
            format!("{normalized_symbol} is not in your watchlist."),
        ));
    }

    store.save(&watchlist)
}
