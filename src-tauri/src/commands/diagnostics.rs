use crate::domain::AppError;
use crate::observability::CommandSpan;
use std::fs;
use tauri::{AppHandle, Manager};

const CACHE_DIR_NAME: &str = "cache";

#[tauri::command]
pub fn clear_cache(app: AppHandle) -> Result<(), AppError> {
    let span = CommandSpan::start("clear_cache", &[]);
    let result = (|| -> Result<(), AppError> {
        let cache_dir = app
            .path()
            .app_config_dir()
            .map_err(|err| {
                AppError::persistence(
                    "cache_path_resolution_failed",
                    format!("Unable to resolve cache directory: {err}"),
                )
            })?
            .join(CACHE_DIR_NAME);

        if cache_dir.exists() {
            fs::remove_dir_all(&cache_dir).map_err(|err| {
                AppError::persistence(
                    "cache_clear_failed",
                    format!("Unable to clear cache directory: {err}"),
                )
            })?;
        }

        Ok(())
    })();

    match result {
        Ok(()) => {
            span.ok(&[]);
            Ok(())
        }
        Err(err) => {
            span.err(&err, &[]);
            Err(err)
        }
    }
}
