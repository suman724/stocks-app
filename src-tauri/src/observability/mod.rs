use crate::domain::AppError;
use std::time::Instant;

pub struct CommandSpan {
    command: &'static str,
    started: Instant,
}

impl CommandSpan {
    pub fn start(command: &'static str, fields: &[(&str, String)]) -> Self {
        log_info("command_start", command, fields);
        Self {
            command,
            started: Instant::now(),
        }
    }

    pub fn ok(self, fields: &[(&str, String)]) {
        let mut all_fields = vec![(
            "duration_ms",
            self.started.elapsed().as_millis().to_string(),
        )];
        all_fields.extend(fields.iter().cloned());
        log_info("command_done", self.command, &all_fields);
    }

    pub fn err(self, err: &AppError, fields: &[(&str, String)]) {
        let mut all_fields = vec![
            (
                "duration_ms",
                self.started.elapsed().as_millis().to_string(),
            ),
            ("error_code", err.code.clone()),
            ("error_message", err.message.clone()),
        ];
        all_fields.extend(fields.iter().cloned());
        log_warn("command_failed", self.command, &all_fields);
    }
}

fn log_info(event: &str, command: &str, fields: &[(&str, String)]) {
    println!("{}", format_log_line("info", event, command, fields));
}

fn log_warn(event: &str, command: &str, fields: &[(&str, String)]) {
    eprintln!("{}", format_log_line("warn", event, command, fields));
}

fn format_log_line(level: &str, event: &str, command: &str, fields: &[(&str, String)]) -> String {
    let mut line = format!("level={level} event={event} command={command}");
    for (key, value) in fields {
        line.push(' ');
        line.push_str(key);
        line.push('=');
        line.push_str(&sanitize(value));
    }
    line
}

fn sanitize(input: &str) -> String {
    input.replace(['\n', '\r', '\t'], " ").replace(' ', "_")
}
