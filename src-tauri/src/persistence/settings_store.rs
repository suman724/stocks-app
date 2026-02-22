use crate::domain::{validate_settings, AppError, AppSettings, AppSettingsInput};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone)]
pub struct SettingsStore {
    file_path: PathBuf,
}

impl SettingsStore {
    pub fn from_app(app: &AppHandle) -> Result<Self, AppError> {
        let base_dir = app.path().app_config_dir().map_err(|err| {
            AppError::persistence(
                "settings_path_resolution_failed",
                format!("Unable to resolve settings directory: {err}"),
            )
        })?;

        Ok(Self::new(base_dir))
    }

    pub fn new(base_dir: PathBuf) -> Self {
        Self {
            file_path: base_dir.join(SETTINGS_FILE_NAME),
        }
    }

    pub fn load(&self) -> Result<AppSettings, AppError> {
        if !self.file_path.exists() {
            return Ok(AppSettings::default());
        }

        let content = fs::read_to_string(&self.file_path).map_err(|err| {
            AppError::persistence(
                "settings_read_failed",
                format!("Unable to read settings from disk: {err}"),
            )
        })?;

        if content.trim().is_empty() {
            return Ok(AppSettings::default());
        }

        serde_json::from_str::<AppSettings>(&content).map_err(|err| {
            AppError::persistence(
                "settings_parse_failed",
                format!("Unable to parse settings file: {err}"),
            )
        })
    }

    pub fn save(&self, input: AppSettingsInput) -> Result<AppSettings, AppError> {
        let validated_settings = validate_settings(input)?;
        self.persist(&validated_settings)?;
        Ok(validated_settings)
    }

    fn persist(&self, settings: &AppSettings) -> Result<(), AppError> {
        ensure_parent_dir(&self.file_path)?;
        let payload = serde_json::to_string_pretty(settings).map_err(|err| {
            AppError::persistence(
                "settings_serialize_failed",
                format!("Unable to serialize settings: {err}"),
            )
        })?;

        fs::write(&self.file_path, payload).map_err(|err| {
            AppError::persistence(
                "settings_write_failed",
                format!("Unable to write settings to disk: {err}"),
            )
        })
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    let parent = path.parent().ok_or_else(|| {
        AppError::persistence(
            "settings_parent_dir_missing",
            "Settings path has no parent directory.",
        )
    })?;

    fs::create_dir_all(parent).map_err(|err| {
        AppError::persistence(
            "settings_dir_create_failed",
            format!("Unable to create settings directory: {err}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{AppProvider, TimeRange};
    use tempfile::tempdir;

    fn sample_input(api_key: &str, refresh_seconds: u32) -> AppSettingsInput {
        AppSettingsInput {
            provider: AppProvider::Twelvedata,
            api_key: api_key.to_string(),
            default_range: TimeRange::OneWeek,
            auto_refresh_seconds: refresh_seconds,
            notifications_enabled: true,
        }
    }

    #[test]
    fn load_returns_default_when_settings_file_is_missing() {
        let temp = tempdir().unwrap();
        let store = SettingsStore::new(temp.path().to_path_buf());

        let settings = store.load().unwrap();
        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn save_and_load_roundtrip_settings() {
        let temp = tempdir().unwrap();
        let store = SettingsStore::new(temp.path().to_path_buf());

        let saved = store.save(sample_input("valid-key-123", 60)).unwrap();
        let loaded = store.load().unwrap();

        assert_eq!(saved, loaded);
        assert_eq!(loaded.api_key, "valid-key-123");
    }

    #[test]
    fn save_rejects_invalid_input() {
        let temp = tempdir().unwrap();
        let store = SettingsStore::new(temp.path().to_path_buf());

        let result = store.save(sample_input("bad", 60));
        assert!(result.is_err());
    }
}

