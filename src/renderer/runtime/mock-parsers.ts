/**
 * Ports of the Rust scanning parsers (`src-tauri/src/parsers/*`) used by the
 * browser dev-preview mock. Keeping them here — rather than hand-listing tag,
 * function and duplicate fixtures — is what makes every mocked screen agree
 * with every other: a duplicate cluster really does start on the line the
 * editor jumps to, and saving a file really does change its line counts.
 *
 * Dev-preview only; `runtime.ts` never reaches this module inside Tauri.
 */

import type { TagRow } from '@shared/api';

// ---------------------------------------------------------------------------
// Language detection — port of src-tauri/src/parsers/languages.rs
// ---------------------------------------------------------------------------

export interface LangDef {
  id: string;
  line: string[];
  block: Array<[string, string]>;
}

const C_LINE = ['//'];
const C_BLOCK: Array<[string, string]> = [['/*', '*/']];

function cLike(id: string): LangDef {
  return { id, line: C_LINE, block: C_BLOCK };
}

const LANGS_BY_EXTENSION: Record<string, LangDef> = {
  ts: cLike('TypeScript'),
  tsx: cLike('TSX'),
  js: cLike('JavaScript'),
  mjs: cLike('JavaScript'),
  cjs: cLike('JavaScript'),
  jsx: cLike('JSX'),
  json: { id: 'JSON', line: [], block: [] },
  php: { id: 'PHP', line: ['//', '#'], block: C_BLOCK },
  py: { id: 'Python', line: ['#'], block: [['"""', '"""'], ["'''", "'''"]] },
  rb: { id: 'Ruby', line: ['#'], block: [['=begin', '=end']] },
  rs: cLike('Rust'),
  go: cLike('Go'),
  java: cLike('Java'),
  kt: cLike('Kotlin'),
  swift: cLike('Swift'),
  sh: { id: 'Shell', line: ['#'], block: [] },
  bash: { id: 'Shell', line: ['#'], block: [] },
  yml: { id: 'YAML', line: ['#'], block: [] },
  yaml: { id: 'YAML', line: ['#'], block: [] },
  toml: { id: 'TOML', line: ['#'], block: [] },
  sql: { id: 'SQL', line: ['--'], block: C_BLOCK },
  html: { id: 'HTML', line: [], block: [['<!--', '-->']] },
  xml: { id: 'XML', line: [], block: [['<!--', '-->']] },
  css: { id: 'CSS', line: [], block: C_BLOCK },
  scss: cLike('SCSS'),
  less: cLike('Less'),
  md: { id: 'Markdown', line: [], block: [] },
};

export function baseName(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

export function extensionOf(relPath: string): string {
  const name = baseName(relPath);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function langOf(relPath: string): LangDef | null {
  const name = baseName(relPath);
  if (name === 'Dockerfile') return { id: 'Dockerfile', line: ['#'], block: [] };
  if (name === 'Makefile' || name === 'GNUmakefile') return { id: 'Makefile', line: ['#'], block: [] };
  return LANGS_BY_EXTENSION[extensionOf(relPath)] ?? null;
}

// ---------------------------------------------------------------------------
// Line counting — port of src-tauri/src/parsers/line_parser.rs
// ---------------------------------------------------------------------------

export interface LineCounts {
  total: number;
  code: number;
  comment: number;
  blank: number;
  blockComment: number;
}

export function splitLines(content: string): string[] {
  return content.split(/\r\n|\r|\n/);
}

export function countLines(content: string, lang: LangDef | null): LineCounts {
  const lines = splitLines(content);
  const counts: LineCounts = { total: lines.length, code: 0, comment: 0, blank: 0, blockComment: 0 };

  if (!lang) {
    for (const line of lines) {
      if (line.trim() === '') counts.blank += 1;
      else counts.code += 1;
    }
    return counts;
  }

  let openBlock: [string, string] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (openBlock) {
      counts.comment += 1;
      counts.blockComment += 1;
      if (trimmed.includes(openBlock[1])) openBlock = null;
      continue;
    }

    if (trimmed === '') {
      counts.blank += 1;
      continue;
    }

    const blockStart = lang.block.find(([start]) => trimmed.startsWith(start));
    if (blockStart) {
      counts.comment += 1;
      counts.blockComment += 1;
      if (!trimmed.includes(blockStart[1], blockStart[0].length)) openBlock = blockStart;
      continue;
    }

    if (lang.line.some(prefix => trimmed.startsWith(prefix))) {
      counts.comment += 1;
      continue;
    }

    counts.code += 1;
  }

  return counts;
}

function isCommentLine(trimmed: string, lang: LangDef | null, openBlock: [string, string] | null): boolean {
  if (!lang) return false;
  if (openBlock) return true;
  if (lang.block.some(([start]) => trimmed.startsWith(start))) return true;
  return lang.line.some(prefix => trimmed.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Tags — port of src-tauri/src/parsers/tag_scanner.rs
// ---------------------------------------------------------------------------

const TAG_PATTERN = /\b(TODO|FIXME|HACK|NOTE|XXX)\b[ \t:-]*([^\r\n]*)/gi;
const TAG_KINDS: ReadonlyArray<TagRow['kind']> = ['TODO', 'FIXME', 'HACK', 'NOTE', 'XXX'];

export function scanTags(content: string, lang: LangDef | null): Array<Omit<TagRow, 'fileId'>> {
  if (!lang) return [];
  const out: Array<Omit<TagRow, 'fileId'>> = [];
  let openBlock: [string, string] | null = null;

  splitLines(content).forEach((line, index) => {
    const trimmed = line.trim();
    const commentLine = isCommentLine(trimmed, lang, openBlock);

    if (openBlock) {
      if (trimmed.includes(openBlock[1])) openBlock = null;
    } else {
      const blockStart = lang.block.find(([start]) => trimmed.startsWith(start));
      if (blockStart && !trimmed.includes(blockStart[1], blockStart[0].length)) openBlock = blockStart;
    }

    if (!commentLine) return;

    TAG_PATTERN.lastIndex = 0;
    let match = TAG_PATTERN.exec(trimmed);
    while (match) {
      const kind = match[1].toUpperCase() as TagRow['kind'];
      if (TAG_KINDS.includes(kind)) {
        out.push({ kind, lineNo: index + 1, text: (match[2] ?? '').trim().slice(0, 240) });
      }
      match = TAG_PATTERN.exec(trimmed);
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Functions — port of src-tauri/src/parsers/func_detect.rs
//
// Deviation, deliberate: the patterns below also tolerate a return-type
// annotation between `)` and `{` (`function foo(): string {`, PHP methods with
// `: JsonResponse`). The Rust regexes require the brace to follow the paren
// directly and therefore skip those; matching that here would leave the
// Functions lens empty for the fixture corpus and unverifiable.
// ---------------------------------------------------------------------------

const BRACE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'c', 'h', 'cpp', 'cc', 'hpp',
  'java', 'kt', 'swift', 'go', 'rs', 'cs', 'scala', 'php', 'dart', 'scss', 'less',
]);

const RETURN_TYPE = '(?::[^\\n{]+)?';
const FUNCTION_PATTERNS = [
  new RegExp(`\\bfunction\\s+([A-Za-z_$][\\w$]*)\\s*\\([^)]*\\)\\s*${RETURN_TYPE}\\s*\\{`, 'g'),
  new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s*)?(?:function\\s*)?\\([^)]*\\)\\s*(?:=>\\s*)?\\{`, 'g'),
  new RegExp(`^[ \\t]{2,}(?:async\\s+|public\\s+|private\\s+|protected\\s+|static\\s+|readonly\\s+)*([A-Za-z_$][\\w$]*)\\s*\\([^)]*\\)\\s*${RETURN_TYPE}\\s*\\{`, 'gm'),
];

export interface FoundFunction {
  name: string;
  startLine: number;
  endLine: number;
  length: number;
}

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (content[i] === '\n') line += 1;
  return line;
}

/** Index of the `}` closing the block opened at `openIndex`, or -1. */
function matchingBrace(content: string, openIndex: number): number {
  let depth = 1;
  let quote: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIndex + 1; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { inLineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { inBlockComment = true; i += 1; continue; }
    if (char === '"' || char === '\'' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

export function findFunctions(content: string, relPath: string): FoundFunction[] {
  if (!BRACE_EXTENSIONS.has(extensionOf(relPath))) return [];

  const seenStartLines = new Set<number>();
  const out: FoundFunction[] = [];

  for (const pattern of FUNCTION_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(content);
    while (match) {
      const openIndex = content.indexOf('{', match.index + match[0].length - 1);
      const startLine = lineOf(content, match.index);
      if (openIndex !== -1 && !seenStartLines.has(startLine)) {
        seenStartLines.add(startLine);
        const closeIndex = matchingBrace(content, openIndex);
        const endLine = closeIndex === -1 ? startLine : lineOf(content, closeIndex);
        out.push({
          name: match[1] ?? '<anonymous>',
          startLine,
          endLine,
          length: Math.max(1, endLine - startLine + 1),
        });
      }
      match = pattern.exec(content);
    }
  }

  return out.sort((left, right) => left.startLine - right.startLine);
}

// ---------------------------------------------------------------------------
// Duplicates — port of src-tauri/src/parsers/duplicate.rs
// ---------------------------------------------------------------------------

const TYPE_DECL_PATTERN = /^(?:export\s+)?(?:abstract\s+|final\s+)?(?:class|interface|trait|enum|record|module)\b/;

function normalizeDuplicateLine(line: string): string {
  return line.split(/\s+/).filter(Boolean).join(' ');
}

function isDuplicateCommentLine(line: string): boolean {
  return line.startsWith('//') || line.startsWith('/*') || line.startsWith('*/')
    || line.startsWith('*') || line.startsWith('#');
}

function isImportOrDecl(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.startsWith('import')
    || lower.startsWith('export import')
    || lower.startsWith('use ')
    || lower.startsWith('namespace')
    || lower.startsWith('require')
    || lower.startsWith('include')
    || TYPE_DECL_PATTERN.test(line);
}

function isStructural(line: string): boolean {
  if (line === '') return true;
  return [...line].every(char => '{}()[];,'.includes(char));
}

function isBoundary(line: string): boolean {
  return line === '' || isDuplicateCommentLine(line) || isImportOrDecl(line) || line.includes('function');
}

function isSubstantive(line: string): boolean {
  return line !== '' && !isStructural(line) && !isDuplicateCommentLine(line)
    && !isImportOrDecl(line) && !line.includes('function');
}

/** Stable non-cryptographic digest; the real backend uses truncated SHA-1. */
export function digest(value: string): string {
  let high = 0x811c9dc5;
  let low = 0x01000193;
  for (let i = 0; i < value.length; i += 1) {
    high = Math.imul(high ^ value.charCodeAt(i), 16777619) >>> 0;
    low = Math.imul(low + value.charCodeAt(i) * (i + 1), 2246822519) >>> 0;
  }
  return high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0');
}

export interface DuplicateSlice {
  hash: string;
  startLine: number;
  endLine: number;
}

export function findDuplicateSlices(content: string, windowSize: number): DuplicateSlice[] {
  const windowLength = Math.max(3, windowSize);
  const lines = splitLines(content).map(normalizeDuplicateLine);
  const segments: number[][] = [];
  let current: number[] = [];

  lines.forEach((line, index) => {
    if (isBoundary(line)) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      return;
    }
    if (isSubstantive(line)) current.push(index);
  });
  if (current.length > 0) segments.push(current);

  const out: DuplicateSlice[] = [];
  for (const segment of segments) {
    if (segment.length < windowLength) continue;
    for (let i = 0; i + windowLength <= segment.length; i += 1) {
      const indexes = segment.slice(i, i + windowLength);
      out.push({
        hash: digest(indexes.map(index => lines[index]).join('\n')),
        startLine: indexes[0] + 1,
        endLine: indexes[indexes.length - 1] + 1,
      });
    }
  }

  return out;
}
