use crate::domain::{unix_timestamp_secs, AppError, QuoteStatus, QuoteSummary};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const CACHE_DIR_NAME: &str = "cache";
const QUOTES_CACHE_FILE_NAME: &str = "quotes.json";
const QUOTE_CACHE_TTL_SECONDS: u64 = 60;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedQuoteEntry {
    pub quote: QuoteSummary,
    pub cached_at: u64,
}

pub type QuoteCacheMap = HashMap<String, CachedQuoteEntry>;

#[derive(Debug, Clone)]
pub struct QuoteCacheStore {
    file_path: PathBuf,
}

impl QuoteCacheStore {
    pub fn from_app(app: &AppHandle) -> Result<Self, AppError> {
        let base_dir = app.path().app_config_dir().map_err(|err| {
            AppError::persistence(
                "quote_cache_path_resolution_failed",
                format!("Unable to resolve quote cache directory: {err}"),
            )
        })?;

        Ok(Self::new(base_dir))
    }

    pub fn new(base_dir: PathBuf) -> Self {
        Self {
            file_path: base_dir.join(CACHE_DIR_NAME).join(QUOTES_CACHE_FILE_NAME),
        }
    }

    pub fn load(&self) -> Result<QuoteCacheMap, AppError> {
        if !self.file_path.exists() {
            return Ok(HashMap::new());
        }

        let content = fs::read_to_string(&self.file_path).map_err(|err| {
            AppError::persistence(
                "quote_cache_read_failed",
                format!("Unable to read quote cache from disk: {err}"),
            )
        })?;

        if content.trim().is_empty() {
            return Ok(HashMap::new());
        }

        serde_json::from_str::<QuoteCacheMap>(&content).map_err(|err| {
            AppError::persistence(
                "quote_cache_parse_failed",
                format!("Unable to parse quote cache file: {err}"),
            )
        })
    }

    pub fn save(&self, cache: &QuoteCacheMap) -> Result<(), AppError> {
        ensure_parent_dir(&self.file_path)?;

        let payload = serde_json::to_string_pretty(cache).map_err(|err| {
            AppError::persistence(
                "quote_cache_serialize_failed",
                format!("Unable to serialize quote cache: {err}"),
            )
        })?;

        fs::write(&self.file_path, payload).map_err(|err| {
            AppError::persistence(
                "quote_cache_write_failed",
                format!("Unable to write quote cache to disk: {err}"),
            )
        })
    }

    pub fn ttl_seconds() -> u64 {
        QUOTE_CACHE_TTL_SECONDS
    }
}

pub fn is_cache_fresh(cached_at: u64, now: u64) -> bool {
    now.saturating_sub(cached_at) <= QUOTE_CACHE_TTL_SECONDS
}

pub fn to_stale_quote(entry: &CachedQuoteEntry, error: &AppError) -> QuoteSummary {
    let mut quote = entry.quote.clone();
    quote.status = QuoteStatus::Stale;
    quote.error_code = Some(error.code.clone());
    quote.error_message = Some(error.message.clone());
    quote
}

pub fn to_cached_entry(quote: QuoteSummary) -> CachedQuoteEntry {
    CachedQuoteEntry {
        quote,
        cached_at: unix_timestamp_secs(),
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    let parent = path.parent().ok_or_else(|| {
        AppError::persistence(
            "quote_cache_parent_dir_missing",
            "Quote cache path has no parent directory.",
        )
    })?;

    fs::create_dir_all(parent).map_err(|err| {
        AppError::persistence(
            "quote_cache_dir_create_failed",
            format!("Unable to create quote cache directory: {err}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_quote() -> QuoteSummary {
        QuoteSummary {
            symbol: "AAPL".to_string(),
            price: 123.4,
            change_abs: Some(1.0),
            change_pct: Some(0.8),
            currency: Some("USD".to_string()),
            last_updated_at: "1730000000".to_string(),
            status: QuoteStatus::Fresh,
            error_code: None,
            error_message: None,
        }
    }

    #[test]
    fn cache_store_roundtrip() {
        let temp = tempdir().unwrap();
        let store = QuoteCacheStore::new(temp.path().to_path_buf());
        let mut cache = QuoteCacheMap::new();
        cache.insert(
            "AAPL".to_string(),
            CachedQuoteEntry {
                quote: sample_quote(),
                cached_at: 100,
            },
        );

        store.save(&cache).unwrap();
        let loaded = store.load().unwrap();
        assert_eq!(loaded.len(), 1);
        assert!(loaded.contains_key("AAPL"));
    }

    #[test]
    fn ttl_logic_marks_only_recent_entries_as_fresh() {
        assert!(is_cache_fresh(100, 130));
        assert!(!is_cache_fresh(100, 161));
    }
}

