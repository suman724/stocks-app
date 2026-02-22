use crate::domain::{AppError, QuoteStatus, SymbolPerformance, TimeRange, unix_timestamp_secs};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const CACHE_DIR_NAME: &str = "cache";
const TIMESERIES_DIR_NAME: &str = "timeseries";
const TIMESERIES_CACHE_TTL_SECONDS: u64 = 300;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedTimeSeriesEntry {
    pub performance: SymbolPerformance,
    pub cached_at: u64,
}

#[derive(Debug, Clone)]
pub struct TimeSeriesCacheStore {
    base_dir: PathBuf,
}

impl TimeSeriesCacheStore {
    pub fn from_app(app: &AppHandle) -> Result<Self, AppError> {
        let base_dir = app.path().app_config_dir().map_err(|err| {
            AppError::persistence(
                "timeseries_cache_path_resolution_failed",
                format!("Unable to resolve timeseries cache directory: {err}"),
            )
        })?;

        Ok(Self::new(base_dir))
    }

    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    pub fn load(
        &self,
        symbol: &str,
        range: TimeRange,
    ) -> Result<Option<CachedTimeSeriesEntry>, AppError> {
        let file_path = self.file_path(symbol, range);
        if !file_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&file_path).map_err(|err| {
            AppError::persistence(
                "timeseries_cache_read_failed",
                format!("Unable to read timeseries cache: {err}"),
            )
        })?;

        if content.trim().is_empty() {
            return Ok(None);
        }

        let entry = serde_json::from_str::<CachedTimeSeriesEntry>(&content).map_err(|err| {
            AppError::persistence(
                "timeseries_cache_parse_failed",
                format!("Unable to parse timeseries cache file: {err}"),
            )
        })?;

        Ok(Some(entry))
    }

    pub fn save(
        &self,
        symbol: &str,
        range: TimeRange,
        performance: SymbolPerformance,
    ) -> Result<(), AppError> {
        let file_path = self.file_path(symbol, range);
        ensure_parent_dir(&file_path)?;

        let entry = CachedTimeSeriesEntry {
            performance,
            cached_at: unix_timestamp_secs(),
        };

        let payload = serde_json::to_string_pretty(&entry).map_err(|err| {
            AppError::persistence(
                "timeseries_cache_serialize_failed",
                format!("Unable to serialize timeseries cache: {err}"),
            )
        })?;

        fs::write(file_path, payload).map_err(|err| {
            AppError::persistence(
                "timeseries_cache_write_failed",
                format!("Unable to write timeseries cache: {err}"),
            )
        })
    }

    fn file_path(&self, symbol: &str, range: TimeRange) -> PathBuf {
        self.base_dir
            .join(CACHE_DIR_NAME)
            .join(TIMESERIES_DIR_NAME)
            .join(format!("{}-{}.json", symbol, range.as_key()))
    }

    pub fn ttl_seconds() -> u64 {
        TIMESERIES_CACHE_TTL_SECONDS
    }
}

pub fn is_timeseries_cache_fresh(cached_at: u64, now: u64) -> bool {
    now.saturating_sub(cached_at) <= TIMESERIES_CACHE_TTL_SECONDS
}

pub fn to_stale_performance(entry: &CachedTimeSeriesEntry) -> SymbolPerformance {
    let mut performance = entry.performance.clone();
    performance.status = QuoteStatus::Stale;
    performance
}

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    let parent = path.parent().ok_or_else(|| {
        AppError::persistence(
            "timeseries_cache_parent_dir_missing",
            "Timeseries cache path has no parent directory.",
        )
    })?;

    fs::create_dir_all(parent).map_err(|err| {
        AppError::persistence(
            "timeseries_cache_dir_create_failed",
            format!("Unable to create timeseries cache directory: {err}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_performance() -> SymbolPerformance {
        SymbolPerformance {
            symbol: "AAPL".to_string(),
            range: TimeRange::OneWeek,
            points: vec![],
            min: 180.0,
            max: 200.0,
            start: 181.0,
            end: 198.0,
            last_updated_at: "2026-02-22 10:00:00".to_string(),
            status: QuoteStatus::Fresh,
        }
    }

    #[test]
    fn timeseries_cache_roundtrip() {
        let temp = tempdir().unwrap();
        let store = TimeSeriesCacheStore::new(temp.path().to_path_buf());

        store
            .save("AAPL", TimeRange::OneWeek, sample_performance())
            .unwrap();
        let loaded = store.load("AAPL", TimeRange::OneWeek).unwrap();
        assert!(loaded.is_some());
    }

    #[test]
    fn timeseries_ttl_logic() {
        assert!(is_timeseries_cache_fresh(100, 350));
        assert!(!is_timeseries_cache_fresh(100, 401));
    }
}
