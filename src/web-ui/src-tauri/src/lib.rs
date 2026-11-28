use std::time::Duration;
use tauri::Manager;

/// Called by the game once it has rendered its first screen:
/// close the splash window and show the main window.
#[tauri::command]
fn app_ready(app: tauri::AppHandle) {
    show_main(&app);
}

/// F11 / Settings: flip fullscreen, or force it with `on`.
#[tauri::command]
fn set_fullscreen(window: tauri::WebviewWindow, on: Option<bool>) {
    let next = on.unwrap_or_else(|| !window.is_fullscreen().unwrap_or(false));
    let _ = window.set_fullscreen(next);
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        if !main.is_visible().unwrap_or(true) {
            let _ = main.show();
            let _ = main.set_fullscreen(true);
            let _ = main.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_ready, set_fullscreen, quit_app])
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
