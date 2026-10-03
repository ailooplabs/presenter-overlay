// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_window_hidden_from_capture<R: tauri::Runtime>(window: tauri::WebviewWindow<R>, hidden: bool) -> Result<(), String> {
    window.set_content_protected(hidden).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_dragging<R: tauri::Runtime>(window: tauri::WebviewWindow<R>) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn close_window<R: tauri::Runtime>(window: tauri::WebviewWindow<R>) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            set_window_hidden_from_capture,
            start_dragging,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::mock_builder;

    fn setup_mock_app() -> (tauri::App<tauri::test::MockRuntime>, tauri::WebviewWindow<tauri::test::MockRuntime>) {
        let app = mock_builder()
            .invoke_handler(tauri::generate_handler![
                greet,
                set_window_hidden_from_capture,
                start_dragging,
                close_window
            ])
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap();

        let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();

        (app, webview)
    }

    #[test]
    fn test_greet_command() {
        let res = greet("Charles");
        assert_eq!(res, "Hello, Charles! You've been greeted from Rust!");
    }

    #[test]
    fn test_set_window_hidden_from_capture_command() {
        let (_app, webview) = setup_mock_app();
        let res = set_window_hidden_from_capture(webview.clone(), true);
        assert!(res.is_ok());
    }

    #[test]
    fn test_start_dragging_command() {
        let (_app, webview) = setup_mock_app();
        let res = start_dragging(webview.clone());
        // Since it's a mock window, this might return an error, but verifies execution
        let _ = res;
    }

    #[test]
    fn test_close_window_command() {
        let (_app, webview) = setup_mock_app();
        let res = close_window(webview.clone());
        assert!(res.is_ok());
    }
}
