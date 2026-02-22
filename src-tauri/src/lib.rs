pub mod commands;
pub mod domain;
pub mod http;
pub mod persistence;
pub mod provider;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::bootstrap::get_app_version,
            commands::bootstrap::get_app_bootstrap_data,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::test_provider_connection,
            commands::watchlist::get_watchlist,
            commands::watchlist::add_symbol,
            commands::watchlist::remove_symbol,
            commands::market_data::refresh_watchlist_quotes,
            commands::market_data::get_symbol_performance,
            commands::market_data::refresh_symbol_performance
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
