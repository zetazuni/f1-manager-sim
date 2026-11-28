use std::time::Duration;
use tauri::Manager;

/// Called by the game once it has rendered its first screen:
/// close the splash window and show the main window.
#[tauri::command]
fn app_ready(app: tauri::AppHandle) {
    show_main(&app);
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        if !main.is_visible().unwrap_or(true) {
            let _ = main.maximize();
            let _ = main.show();
            let _ = main.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_ready])
        .setup(|app| {
            // Safety net: never leave the player on the splash if the game
            // fails to report ready (for example a WebView error).
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(10));
                let h = handle.clone();
                let _ = handle.run_on_main_thread(move || show_main(&h));
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Zetrace");
}
