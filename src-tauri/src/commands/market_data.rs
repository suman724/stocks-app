use crate::domain::{unix_timestamp_secs, AppError, QuoteStatus, QuoteSummary};
use crate::http::build_http_client;
use crate::persistence::{
    is_cache_fresh, to_cached_entry, to_stale_quote, QuoteCacheMap, QuoteCacheStore, SettingsStore,
    WatchlistStore,
};
use crate::provider::{MarketDataProvider, TwelveDataAdapter};
use tauri::AppHandle;

const QUOTE_REQUEST_TIMEOUT_SECONDS: u64 = 8;

#[tauri::command]
pub async fn refresh_watchlist_quotes(app: AppHandle) -> Result<Vec<QuoteSummary>, AppError> {
    let settings = SettingsStore::from_app(&app)?.load()?;
    if settings.api_key.trim().is_empty() {
        return Err(AppError::validation(
            "invalid_settings",
            "Save an API key before refreshing quotes.",
        ));
    }

    let watchlist = WatchlistStore::from_app(&app)?.load()?;
    if watchlist.is_empty() {
        return Ok(Vec::new());
    }

    let cache_store = QuoteCacheStore::from_app(&app)?;
    let mut cache = cache_store.load()?;
    let client = build_http_client(QUOTE_REQUEST_TIMEOUT_SECONDS)?;
    let provider = TwelveDataAdapter::new(client);

    let now = unix_timestamp_secs();
    let mut quotes = Vec::with_capacity(watchlist.len());

    for item in &watchlist {
        let symbol = item.symbol.clone();
        if let Some(entry) = cache.get(&symbol)
            && is_cache_fresh(entry.cached_at, now)
        {
            let mut fresh_quote = entry.quote.clone();
            fresh_quote.status = QuoteStatus::Fresh;
            fresh_quote.error_code = None;
            fresh_quote.error_message = None;
            quotes.push(fresh_quote);
            continue;
        }

        match provider.fetch_quote(&symbol, &settings.api_key).await {
            Ok(mut quote) => {
                quote.status = QuoteStatus::Fresh;
                quote.error_code = None;
                quote.error_message = None;
                cache.insert(symbol.clone(), to_cached_entry(quote.clone()));
                quotes.push(quote);
            }
            Err(err) => {
                if let Some(entry) = cache.get(&symbol) {
                    quotes.push(to_stale_quote(entry, &err));
                } else {
                    quotes.push(QuoteSummary {
                        symbol: symbol.clone(),
                        price: 0.0,
                        change_abs: None,
                        change_pct: None,
                        currency: None,
                        last_updated_at: unix_timestamp_secs().to_string(),
                        status: QuoteStatus::Error,
                        error_code: Some(err.code),
                        error_message: Some(err.message),
                    });
                }
            }
        }
    }

    trim_cache_to_watchlist(&mut cache, &watchlist);
    cache_store.save(&cache)?;
    Ok(quotes)
}

fn trim_cache_to_watchlist(cache: &mut QuoteCacheMap, watchlist: &[crate::domain::WatchlistItem]) {
    let keep: std::collections::HashSet<&str> = watchlist.iter().map(|item| item.symbol.as_str()).collect();
    cache.retain(|symbol, _| keep.contains(symbol.as_str()));
}
