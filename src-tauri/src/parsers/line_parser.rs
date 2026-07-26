use super::languages::LangDef;

#[derive(Debug, Clone, Default)]
pub struct LineCounts {
    pub total: i64,
    pub code: i64,
    pub comment: i64,
    pub blank: i64,
    pub block_comment: i64,
}

pub(crate) fn find_char_offset(haystack: &str, needle: &str) -> Option<usize> {
    haystack
        .find(needle)
        .map(|byte_offset| haystack[..byte_offset].chars().count())
}

pub fn count_lines(content: &str, lang: Option<&LangDef>) -> LineCounts {
    // Proper split preserving lines like JS
    let lines: Vec<&str> = {
        let mut out = Vec::new();
        let mut start = 0;
        let bytes = content.as_bytes();
        let mut i = 0;
        while i < bytes.len() {
            if bytes[i] == b'\r' {
                out.push(&content[start..i]);
                if i + 1 < bytes.len() && bytes[i + 1] == b'\n' {
                    i += 2;
                } else {
                    i += 1;
                }
                start = i;
            } else if bytes[i] == b'\n' {
                out.push(&content[start..i]);
                i += 1;
                start = i;
            } else {
                i += 1;
            }
        }
        out.push(&content[start..]);
        out
    };

    let mut counts = LineCounts {
        total: lines.len() as i64,
        ..Default::default()
    };
    let Some(lang) = lang else {
        for ln in &lines {
            if ln.trim().is_empty() {
                counts.blank += 1;
            } else {
                counts.code += 1;
            }
        }
        return counts;
    };

    let mut in_block: Option<(&str, &str)> = None;
    for raw in &lines {
        let trimmed = raw.trim();
        if trimmed.is_empty() && in_block.is_none() {
            counts.blank += 1;
            continue;
        }
        let mut i = 0;
        let chars: Vec<char> = raw.chars().collect();
        let mut saw_code = false;
        let mut saw_comment = false;
        let mut saw_block = false;
        let mut in_string: Option<(&str, &str)> = None;

        while i < chars.len() {
            if let Some((_, end)) = in_block {
                saw_block = true;
                let rest: String = chars[i..].iter().collect();
                if let Some(pos) = find_char_offset(&rest, end) {
                    i += end.chars().count() + pos;
                    in_block = None;
                } else {
                    i = chars.len();
                }
                continue;
            }
            if let Some((_, end)) = in_string {
                let rest: String = chars[i..].iter().collect();
                // naive find end
                if let Some(cursor) = find_char_offset(&rest, end) {
                    // handle escapes roughly
                    let mut abs = i + cursor;
                    loop {
                        let mut bs = 0;
                        let mut k = abs;
                        while k > i {
                            k -= 1;
                            if chars[k] == '\\' {
                                bs += 1;
                            } else {
                                break;
                            }
                        }
                        if bs % 2 == 0 {
                            break;
                        }
                        let after = abs + end.chars().count();
                        let rest2: String = chars[after..].iter().collect();
                        if let Some(n) = find_char_offset(&rest2, end) {
                            abs = after + n;
                        } else {
                            abs = chars.len();
                            break;
                        }
                    }
                    if abs >= chars.len() {
                        i = chars.len();
                    } else {
                        i = abs + end.chars().count();
                        in_string = None;
                    }
                } else {
                    i = chars.len();
                }
                continue;
            }

            let ch = chars[i];
            if ch == ' ' || ch == '\t' {
                i += 1;
                continue;
            }

            let rest: String = chars[i..].iter().collect();
            let mut matched = false;
            for m in lang.line {
                if rest.starts_with(m) {
                    saw_comment = true;
                    i = chars.len();
                    matched = true;
                    break;
                }
            }
            if matched {
                break;
            }

            for &(start, end) in lang.block {
                if rest.starts_with(start) {
                    i += start.chars().count();
                    let rest2: String = chars[i..].iter().collect();
                    if let Some(pos) = find_char_offset(&rest2, end) {
                        saw_block = true;
                        i += pos + end.chars().count();
                    } else {
                        saw_block = true;
                        in_block = Some((start, end));
                        i = chars.len();
                    }
                    matched = true;
                    break;
                }
            }
            if matched {
                continue;
            }

            for &(s, e) in lang.string {
                if rest.starts_with(s) {
                    i += s.chars().count();
                    in_string = Some((s, e));
                    matched = true;
                    break;
                }
            }
            if matched {
                continue;
            }

            saw_code = true;
            i += 1;
        }

        if saw_block {
            counts.block_comment += 1;
        } else if saw_comment && !saw_code {
            counts.comment += 1;
        } else if saw_code {
            counts.code += 1;
        } else if saw_comment {
            counts.comment += 1;
        } else {
            counts.blank += 1;
        }
    }
    counts
}

#[cfg(test)]
mod tests {
    use super::count_lines;
    use crate::parsers::languages::detect_lang;

    #[test]
    fn handles_unicode_before_escaped_string_delimiters() {
        let (_, lang, _) = detect_lang("example.ts");
        let counts = count_lines(r#"const message = "中文\"内容";"#, lang.as_ref());

        assert_eq!(counts.total, 1);
        assert_eq!(counts.code, 1);
    }

    #[test]
    fn handles_unicode_inside_block_comments() {
        let (_, lang, _) = detect_lang("example.ts");
        let counts = count_lines("/* 中文注释 */\nconst value = 1;", lang.as_ref());

        assert_eq!(counts.total, 2);
        assert_eq!(counts.block_comment, 1);
        assert_eq!(counts.code, 1);
    }
}
