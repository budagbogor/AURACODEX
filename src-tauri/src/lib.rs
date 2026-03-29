use tauri::{AppHandle, Emitter, Manager, State};
use notify::{Watcher, RecursiveMode, RecommendedWatcher, Config, Event};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

struct WatcherState {
  watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
fn start_watcher(app: AppHandle, state: State<'_, WatcherState>, path: String) -> Result<(), String> {
  let mut watcher_lock = state.watcher.lock().unwrap();
  
  // Stop existing watcher if any
  if watcher_lock.is_some() {
    *watcher_lock = None;
  }

  let app_clone = app.clone();
  let path_buf = PathBuf::from(&path);

  let mut watcher = RecommendedWatcher::new(move |res: notify::Result<Event>| {
    match res {
      Ok(event) => {
        // Log event for debug
        println!("[AURA FS] Event detected: {:?}", event);
        
        // Emit event to frontend
        let _ = app_clone.emit("aura://fs-event", "change");
      },
      Err(e) => println!("[AURA FS] Watch error: {:?}", e),
    }
  }, Config::default()).map_err(|e| e.to_string())?;

  watcher.watch(&path_buf, RecursiveMode::Recursive).map_err(|e| e.to_string())?;
  
  *watcher_lock = Some(watcher);
  println!("[AURA FS] Watcher started for: {}", path);
  
  Ok(())
}

#[tauri::command]
fn stop_watcher(state: State<'_, WatcherState>) -> Result<(), String> {
  let mut watcher_lock = state.watcher.lock().unwrap();
  *watcher_lock = None;
  println!("[AURA FS] Watcher stopped.");
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      app.handle().plugin(tauri_plugin_shell::init())?;
      app.handle().plugin(tauri_plugin_dialog::init())?;
      app.handle().plugin(tauri_plugin_fs::init())?;
      
      app.manage(WatcherState {
        watcher: Mutex::new(None),
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_watcher, stop_watcher])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
