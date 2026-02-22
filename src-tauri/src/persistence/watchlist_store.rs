use crate::domain::{AppError, WatchlistItem};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const WATCHLIST_FILE_NAME: &str = "watchlist.json";

#[derive(Debug, Clone)]
pub struct WatchlistStore {
    file_path: PathBuf,
}

impl WatchlistStore {
    pub fn from_app(app: &AppHandle) -> Result<Self, AppError> {
        let base_dir = app.path().app_config_dir().map_err(|err| {
            AppError::persistence(
                "watchlist_path_resolution_failed",
                format!("Unable to resolve watchlist directory: {err}"),
            )
        })?;

        Ok(Self::new(base_dir))
    }

    pub fn new(base_dir: PathBuf) -> Self {
        Self {
            file_path: base_dir.join(WATCHLIST_FILE_NAME),
        }
    }

    pub fn load(&self) -> Result<Vec<WatchlistItem>, AppError> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&self.file_path).map_err(|err| {
            AppError::persistence(
                "watchlist_read_failed",
                format!("Unable to read watchlist from disk: {err}"),
            )
        })?;

        if content.trim().is_empty() {
            return Ok(Vec::new());
        }

        serde_json::from_str::<Vec<WatchlistItem>>(&content).map_err(|err| {
            AppError::persistence(
                "watchlist_parse_failed",
                format!("Unable to parse watchlist file: {err}"),
            )
        })
    }

    pub fn save(&self, watchlist: &[WatchlistItem]) -> Result<Vec<WatchlistItem>, AppError> {
        ensure_parent_dir(&self.file_path)?;
        let payload = serde_json::to_string_pretty(watchlist).map_err(|err| {
            AppError::persistence(
                "watchlist_serialize_failed",
                format!("Unable to serialize watchlist: {err}"),
            )
        })?;

        fs::write(&self.file_path, payload).map_err(|err| {
            AppError::persistence(
                "watchlist_write_failed",
                format!("Unable to write watchlist to disk: {err}"),
            )
        })?;

        Ok(watchlist.to_vec())
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    let parent = path.parent().ok_or_else(|| {
        AppError::persistence(
            "watchlist_parent_dir_missing",
            "Watchlist path has no parent directory.",
        )
    })?;

    fs::create_dir_all(parent).map_err(|err| {
        AppError::persistence(
            "watchlist_dir_create_failed",
            format!("Unable to create watchlist directory: {err}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_returns_empty_when_file_is_missing() {
        let temp = tempdir().unwrap();
        let store = WatchlistStore::new(temp.path().to_path_buf());

        let watchlist = store.load().unwrap();
        assert!(watchlist.is_empty());
    }

    #[test]
    fn save_and_load_roundtrip_watchlist() {
        let temp = tempdir().unwrap();
        let store = WatchlistStore::new(temp.path().to_path_buf());

        let items = vec![WatchlistItem {
            symbol: "AAPL".to_string(),
            display_name: Some("Apple".to_string()),
            pinned: Some(true),
        }];

        store.save(&items).unwrap();
        let loaded = store.load().unwrap();

        assert_eq!(loaded, items);
    }
}

