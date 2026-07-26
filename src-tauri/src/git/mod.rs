use crate::error::AppResult;
use crate::types::{GitAuthorStat, GitFileInfo, GitRepoInfo, HeatmapBucket};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

fn run_git(root: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .output()
        .ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

fn is_repo(root: &Path) -> bool {
    run_git(root, &["rev-parse", "--is-inside-work-tree"])
        .map(|s| s.trim() == "true")
        .unwrap_or(false)
}

pub fn get_git_file_info(root: &Path, rel_path: &str) -> AppResult<Option<GitFileInfo>> {
    if !is_repo(root) { return Ok(None); }
    let log = run_git(root, &["log", "-n", "1", "--pretty=format:%H%n%an%n%aI", "--", rel_path]);
    let (last_sha, last_author, last_date) = if let Some(log) = log {
        let mut lines = log.lines();
        let sha = lines.next().map(|s| s.to_string());
        let author = lines.next().map(|s| s.to_string());
        let date = lines.next().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s.trim())
                .ok()
                .map(|d| d.timestamp_millis())
        });
        (sha, author, date)
    } else {
        (None, None, None)
    };

    let mut top_authors = Vec::new();
    if let Some(blame) = run_git(root, &["blame", "--line-porcelain", rel_path]) {
        let mut counts: HashMap<String, i64> = HashMap::new();
        for line in blame.lines() {
            if let Some(a) = line.strip_prefix("author ") {
                *counts.entry(a.to_string()).or_default() += 1;
            }
        }
        let mut authors: Vec<_> = counts.into_iter().map(|(author, lines)| GitAuthorStat { author, lines }).collect();
        authors.sort_by(|a, b| b.lines.cmp(&a.lines));
        authors.truncate(5);
        top_authors = authors;
    }

    Ok(Some(GitFileInfo {
        last_sha,
        last_author,
        last_date,
        top_authors,
    }))
}

/// Consume one line of `git log --pretty=format:__CLA_COMMIT__%aI --name-only`
/// output (newest commit first). The first commit that mentions a path is its
/// last-touch date. Returns `false` once every wanted path is resolved so the
/// caller can stop reading.
fn consume_git_log_line(
    line: &str,
    wanted: &std::collections::HashSet<&str>,
    current_ts: &mut Option<i64>,
    out: &mut HashMap<String, i64>,
) -> bool {
    if let Some(date) = line.strip_prefix("__CLA_COMMIT__") {
        *current_ts = chrono::DateTime::parse_from_rfc3339(date.trim())
            .ok()
            .map(|d| d.timestamp_millis());
        return true;
    }
    let path = line.trim();
    if path.is_empty() {
        return true;
    }
    if let Some(ts) = *current_ts {
        if wanted.contains(path) && !out.contains_key(path) {
            out.insert(path.to_string(), ts);
            if out.len() == wanted.len() {
                return false;
            }
        }
    }
    true
}

/// Batch variant of the per-file last-commit-date lookup: one `git rev-parse`
/// plus one streamed `git log` instead of two subprocesses per file. Paths
/// never committed are simply absent from the returned map.
pub fn get_git_last_dates(root: &Path, rel_paths: &[String]) -> HashMap<String, i64> {
    use std::io::BufRead;

    let mut out = HashMap::new();
    if rel_paths.is_empty() || !is_repo(root) {
        return out;
    }
    let wanted: std::collections::HashSet<&str> = rel_paths.iter().map(String::as_str).collect();
    let Ok(mut child) = Command::new("git")
        .args(["log", "--pretty=format:__CLA_COMMIT__%aI", "--name-only"])
        .current_dir(root)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
    else {
        return out;
    };
    if let Some(stdout) = child.stdout.take() {
        let mut current_ts: Option<i64> = None;
        for line in std::io::BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if !consume_git_log_line(&line, &wanted, &mut current_ts, &mut out) {
                break;
            }
        }
    }
    // Stop early once all paths are resolved; kill the log process if it is
    // still producing history.
    let _ = child.kill();
    let _ = child.wait();
    out
}

fn normalize_remote_web(url: &str) -> Option<String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return None;
    }
    let lower = trimmed.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        return Some(
            trimmed
                .trim_end_matches(".git")
                .trim_end_matches(".GIT")
                .to_string(),
        );
    }
    if let Some(rest) = trimmed.strip_prefix("git@") {
        if let Some((host, path)) = rest.split_once(':') {
            return Some(format!(
                "https://{host}/{}",
                path.trim_end_matches(".git")
            ));
        }
    }
    // ssh://git@host/path or git://host/path
    if let Some(rest) = trimmed
        .strip_prefix("ssh://")
        .or_else(|| trimmed.strip_prefix("git://"))
    {
        let rest = rest.split_once('@').map(|(_, r)| r).unwrap_or(rest);
        if let Some((host, path)) = rest.split_once('/') {
            return Some(format!(
                "https://{host}/{}",
                path.trim_end_matches(".git")
            ));
        }
    }
    None
}

pub fn get_git_repo_info(root: &Path) -> AppResult<Option<GitRepoInfo>> {
    if !is_repo(root) { return Ok(None); }
    let log = run_git(root, &["log", "-n", "1", "--pretty=format:%H%n%aI"]);
    let (last_commit_sha, last_commit_date) = if let Some(log) = log {
        let mut lines = log.lines();
        let sha = lines.next().map(|s| s.to_string());
        let date = lines.next().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s.trim())
                .ok()
                .map(|d| d.timestamp_millis())
        });
        (sha, date)
    } else {
        (None, None)
    };
    let remote = run_git(root, &["remote", "get-url", "origin"]).map(|s| s.trim().to_string());
    let web = remote.as_deref().and_then(normalize_remote_web);
    Ok(Some(GitRepoInfo {
        last_commit_sha,
        last_commit_date,
        remote_origin_url: remote,
        remote_origin_web_url: web,
    }))
}

pub fn get_git_heatmap(root: &Path, days: i64) -> AppResult<Vec<HeatmapBucket>> {
    if !is_repo(root) { return Ok(vec![]); }
    let since = format!("{}.days", days.max(1));
    let raw = match run_git(root, &[
        "log", &format!("--since={since}"), "--date=short",
        "--pretty=format:__CLA_DATE__%ad", "--numstat", "--",
    ]) {
        Some(s) => s,
        None => return Ok(vec![]),
    };
    let mut buckets: HashMap<String, (std::collections::HashSet<String>, i64)> = HashMap::new();
    let mut current = String::new();
    for line in raw.lines() {
        if line.trim().is_empty() { continue; }
        if let Some(date) = line.strip_prefix("__CLA_DATE__") {
            current = date.trim().to_string();
            buckets.entry(current.clone()).or_insert_with(|| (std::collections::HashSet::new(), 0));
            continue;
        }
        if current.is_empty() { continue; }
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 3 { continue; }
        let added: i64 = parts[0].parse().unwrap_or(0);
        let deleted: i64 = parts[1].parse().unwrap_or(0);
        let file = parts[2].to_string();
        if let Some(b) = buckets.get_mut(&current) {
            b.0.insert(file);
            b.1 += added + deleted;
        }
    }
    let mut out: Vec<HeatmapBucket> = buckets
        .into_iter()
        .map(|(date, (files, lines))| HeatmapBucket {
            date,
            files: files.len() as i64,
            lines,
        })
        .collect();
    out.sort_by(|a, b| a.date.cmp(&b.date));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    /// Drive `consume_git_log_line` over a full log output the way
    /// `get_git_last_dates` streams it.
    fn parse_log(raw: &str, rel_paths: &[&str]) -> HashMap<String, i64> {
        let wanted: HashSet<&str> = rel_paths.iter().copied().collect();
        let mut out = HashMap::new();
        let mut current_ts: Option<i64> = None;
        for line in raw.lines() {
            if !consume_git_log_line(line, &wanted, &mut current_ts, &mut out) {
                break;
            }
        }
        out
    }

    const LOG: &str = "\
__CLA_COMMIT__2024-06-02T10:00:00+08:00
src/newer.rs
src/both.rs

__CLA_COMMIT__2024-06-01T10:00:00+08:00
src/both.rs
src/older.rs
";

    #[test]
    fn newest_commit_wins_per_path() {
        let dates = parse_log(LOG, &["src/newer.rs", "src/both.rs", "src/older.rs"]);
        let newer = chrono::DateTime::parse_from_rfc3339("2024-06-02T10:00:00+08:00")
            .unwrap()
            .timestamp_millis();
        let older = chrono::DateTime::parse_from_rfc3339("2024-06-01T10:00:00+08:00")
            .unwrap()
            .timestamp_millis();
        assert_eq!(dates.get("src/newer.rs"), Some(&newer));
        // First (newest) occurrence wins, not the later one.
        assert_eq!(dates.get("src/both.rs"), Some(&newer));
        assert_eq!(dates.get("src/older.rs"), Some(&older));
    }

    #[test]
    fn unrequested_and_uncommitted_paths_are_absent() {
        let dates = parse_log(LOG, &["src/newer.rs", "src/never_committed.rs"]);
        assert_eq!(dates.len(), 1);
        assert!(dates.contains_key("src/newer.rs"));
        assert!(!dates.contains_key("src/both.rs"));
        assert!(!dates.contains_key("src/never_committed.rs"));
    }

    #[test]
    fn stops_early_once_all_paths_resolved() {
        let wanted: HashSet<&str> = ["src/newer.rs"].into_iter().collect();
        let mut out = HashMap::new();
        let mut current_ts: Option<i64> = None;
        let mut stopped_at = None;
        for (i, line) in LOG.lines().enumerate() {
            if !consume_git_log_line(line, &wanted, &mut current_ts, &mut out) {
                stopped_at = Some(i);
                break;
            }
        }
        // Resolved on the second line; the older commit is never read.
        assert_eq!(stopped_at, Some(1));
        assert_eq!(out.len(), 1);
    }

    #[test]
    fn malformed_date_lines_are_skipped() {
        let raw = "__CLA_COMMIT__not-a-date\nsrc/a.rs\n";
        let dates = parse_log(raw, &["src/a.rs"]);
        assert!(dates.is_empty());
    }
}
