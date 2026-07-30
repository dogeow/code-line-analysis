import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface EditorNavigationOptions {
  loaded: boolean;
  targetLine: number;
  targetEndLine: number;
  highlightKind: string | null;
}

interface CursorPosition {
  line: number;
  column: number;
}

export function useEditorNavigation({
  loaded,
  targetLine,
  targetEndLine,
  highlightKind,
}: EditorNavigationOptions) {
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 });
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const cursorSubscriptionRef = useRef<{ dispose: () => void } | null>(null);

  const revealTargetLine = useCallback((lineNumber: number, endLine?: number) => {
    const mountedEditor = editorRef.current;
    if (!mountedEditor || lineNumber <= 0) return;
    const model = mountedEditor.getModel();
    if (!model) return;
    const lineCount = model.getLineCount() || 1;
    const safeLineNumber = Math.min(Math.max(lineNumber, 1), lineCount);
    const safeEndLine = Math.min(Math.max(endLine ?? lineNumber, safeLineNumber), lineCount);

    if (safeEndLine > safeLineNumber) {
      mountedEditor.revealLinesInCenter(safeLineNumber, safeEndLine);
      mountedEditor.setSelection({
        startLineNumber: safeLineNumber,
        startColumn: 1,
        endLineNumber: safeEndLine,
        endColumn: model.getLineMaxColumn(safeEndLine),
      });
    } else {
      mountedEditor.revealLineInCenter(safeLineNumber);
      mountedEditor.setPosition({ lineNumber: safeLineNumber, column: 1 });
    }
    mountedEditor.focus();
  }, []);

  const clearHighlights = useCallback(() => {
    const mountedEditor = editorRef.current;
    if (!mountedEditor || decorationIdsRef.current.length === 0) return;
    decorationIdsRef.current = mountedEditor.deltaDecorations(decorationIdsRef.current, []);
  }, []);

  const applyHighlights = useCallback((startLine: number, endLine: number, kind: string | null) => {
    const mountedEditor = editorRef.current;
    const monacoInstance = monacoRef.current;
    const model = mountedEditor?.getModel();
    if (!mountedEditor || !monacoInstance || !model || startLine <= 0) {
      clearHighlights();
      return;
    }

    const lineCount = model.getLineCount() || 1;
    const safeStart = Math.min(Math.max(startLine, 1), lineCount);
    const safeEnd = Math.min(Math.max(endLine || startLine, safeStart), lineCount);
    const tone = kind === 'duplicate' ? 'duplicate' : kind === 'function' ? 'function' : 'default';

    decorationIdsRef.current = mountedEditor.deltaDecorations(decorationIdsRef.current, [
      {
        range: new monacoInstance.Range(safeStart, 1, safeEnd, model.getLineMaxColumn(safeEnd)),
        options: {
          isWholeLine: true,
          className: `editor-highlight-range ${tone}`,
          linesDecorationsClassName: `editor-highlight-gutter ${tone}`,
        },
      },
      {
        range: new monacoInstance.Range(safeStart, 1, safeStart, model.getLineMaxColumn(safeStart)),
        options: {
          isWholeLine: true,
          className: `editor-highlight-anchor ${tone}`,
        },
      },
    ]);
  }, [clearHighlights]);

  const onMount: OnMount = useCallback((mountedEditor, monacoInstance) => {
    editorRef.current = mountedEditor;
    monacoRef.current = monacoInstance;
    cursorSubscriptionRef.current?.dispose();
    cursorSubscriptionRef.current = mountedEditor.onDidChangeCursorPosition(event => {
      setCursor({ line: event.position.lineNumber, column: event.position.column });
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !loaded) return;
    if (targetLine <= 0) {
      clearHighlights();
      return;
    }
    applyHighlights(targetLine, targetEndLine, highlightKind);
    revealTargetLine(targetLine, targetEndLine);
  }, [
    applyHighlights,
    clearHighlights,
    highlightKind,
    loaded,
    ready,
    revealTargetLine,
    targetEndLine,
    targetLine,
  ]);

  useEffect(() => () => {
    clearHighlights();
    cursorSubscriptionRef.current?.dispose();
  }, [clearHighlights]);

  return { cursor, onMount, revealTargetLine };
}
