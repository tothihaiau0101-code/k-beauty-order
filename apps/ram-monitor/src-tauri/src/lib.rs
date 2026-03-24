use sysinfo::System;
use serde::Serialize;

#[derive(Serialize)]
struct SystemInfo {
    total_memory: u64,
    used_memory: u64,
    free_memory: u64,
    percent: f64,
}

#[derive(Serialize)]
struct ProcessInfo {
    pid: u32,
    name: String,
    ram_mb: f64,
    ram_bytes: u64,
    cpu_percent: f32,
    status: String,
}

#[derive(Serialize)]
struct ProcessList {
    processes: Vec<ProcessInfo>,
    count: usize,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_memory();
    let total = sys.total_memory();
    let used = sys.used_memory();
    SystemInfo {
        total_memory: total,
        used_memory: used,
        free_memory: total - used,
        percent: (used as f64 / total as f64) * 100.0,
    }
}

#[tauri::command]
fn get_processes() -> ProcessList {
    let mut sys = System::new_all();
    sys.refresh_all();
    let mut processes: Vec<ProcessInfo> = sys.processes().values()
        .filter_map(|p| {
            let ram = p.memory();
            let ram_mb = ram as f64 / (1024.0 * 1024.0);
            if ram_mb < 1.0 { return None; }
            Some(ProcessInfo {
                pid: p.pid().as_u32(),
                name: p.name().to_string_lossy().to_string(),
                ram_mb: (ram_mb * 10.0).round() / 10.0,
                ram_bytes: ram,
                cpu_percent: p.cpu_usage(),
                status: format!("{:?}", p.status()),
            })
        })
        .collect();
    processes.sort_by(|a, b| b.ram_bytes.cmp(&a.ram_bytes));
    let count = processes.len();
    ProcessList { processes, count }
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<String, String> {
    let sys = System::new_all();
    let pid_sys = sysinfo::Pid::from_u32(pid);
    if let Some(process) = sys.process(pid_sys) {
        let name = process.name().to_string_lossy().to_string();
        let protected = ["kernel_task", "launchd", "WindowServer", "loginwindow"];
        if protected.contains(&name.as_str()) {
            return Err(format!("Cannot kill protected process: {}", name));
        }
        if process.kill() {
            Ok(format!("Killed {} (PID: {})", name, pid))
        } else {
            Err(format!("Failed to kill {} (PID: {})", name, pid))
        }
    } else {
        Err(format!("Process {} not found", pid))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_system_info, get_processes, kill_process])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
