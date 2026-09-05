import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, scrollPastEnd } from "@codemirror/view";
import { Bold, Code, Heading1, Heading2, Heading3, Italic, Link2, List, Quote, Strikethrough } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveTheme, usePreferences } from "@/store/preferences";

const hidden = Decoration.replace({});
const syntax = Decoration.mark({ class: "cm-md-syntax" });

function addInline(ranges, line, pattern, className, markerSize = 2) {
  for (const match of line.text.matchAll(pattern)) {
    const start = line.from + match.index;
    const end = start + match[0].length;
    const contentStart = start + markerSize;
    const contentEnd = end - markerSize;
    if (contentEnd <= contentStart) continue;
    ranges.push([contentStart, contentEnd, Decoration.mark({ class: className })]);
    ranges.push([start, contentStart, hidden], [contentEnd, end, hidden]);
  }
}

function addMarkdownLinks(ranges, line) {
  for (const match of line.text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const start = line.from + match.index;
    const labelStart = start + 1;
    const labelEnd = labelStart + match[1].length;
    const end = start + match[0].length;
    ranges.push([start, labelStart, hidden]);
    ranges.push([labelStart, labelEnd, Decoration.mark({ class: "cm-md-note-link" })]);
    ranges.push([labelEnd, end, hidden]);
  }
}

function buildDecorations(view) {
  const ranges = [];
  const activeHead = view.state.selection.main.head;
  let inCodeBlock = false;

  for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber);
    const active = activeHead >= line.from && activeHead <= line.to;
    const fence = line.text.match(/^\s*```/);

    if (fence) {
      const fenceClass = inCodeBlock ? "cm-md-code-fence-close" : "cm-md-code-fence-open";
      ranges.push([line.from, line.from, Decoration.line({ class: `cm-md-code-block-line ${fenceClass}` })]);
      if (!active && line.to > line.from) ranges.push([line.from, line.to, hidden]);
      else if (line.to > line.from) ranges.push([line.from, line.to, syntax]);
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      ranges.push([line.from, line.from, Decoration.line({ class: "cm-md-code-block-line" })]);
      if (line.to > line.from) ranges.push([line.from, line.to, Decoration.mark({ class: "cm-md-code-block-text" })]);
      continue;
    }

    const heading = line.text.match(/^(#{1,6})\s+/);

    if (heading) {
      const level = heading[1].length;
      const markerEnd = line.from + heading[0].length;
      ranges.push([
        line.from,
        markerEnd,
        active ? syntax : hidden,
      ]);
      if (markerEnd < line.to) {
        ranges.push([
          markerEnd,
          line.to,
          Decoration.mark({ class: `cm-md-heading cm-md-h${level}` }),
        ]);
      }
    }

    if (!active) {
      addInline(ranges, line, /\*\*(.+?)\*\*/g, "cm-md-strong");
      addInline(ranges, line, /(?<!\*)\*([^*\n]+)\*(?!\*)/g, "cm-md-em", 1);
      addInline(ranges, line, /~~(.+?)~~/g, "cm-md-strike");
      addInline(ranges, line, /`([^`]+?)`/g, "cm-md-code", 1);
      addInline(ranges, line, /\[\[(.+?)\]\]/g, "cm-md-note-link");
      addMarkdownLinks(ranges, line);

      const quote = line.text.match(/^>\s+/);
      if (quote) {
        ranges.push([line.from, line.from + quote[0].length, hidden]);
        ranges.push([line.from + quote[0].length, line.to, Decoration.mark({ class: "cm-md-quote" })]);
      }

      const list = line.text.match(/^(\s*)([-*+] |\d+\. )/);
      if (list) {
        const markerStart = line.from + list[1].length;
        const markerEnd = markerStart + list[2].length;
        ranges.push([markerStart, markerEnd, Decoration.replace({ widget: new ListMarkerWidget(list[2]) })]);
      }
    }
  }

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const builder = new RangeSetBuilder();
  let lastFrom = -1;
  for (const [from, to, decoration] of ranges) {
    if (from < lastFrom || to < from) continue;
    builder.add(from, to, decoration);
    lastFrom = from;
  }
  return builder.finish();
}

class ListMarkerWidget extends WidgetType {
  constructor(marker) { super(); this.marker = marker; }
  eq(other) { return other.marker === this.marker; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-list-marker";
    span.textContent = /^\d/.test(this.marker) ? this.marker.trim() : "•";
    return span;
  }
}

function livePreview() {
  return ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = buildDecorations(view); }
      update(update) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--color-background)", color: "var(--color-foreground)", fontSize: "16px" },
  ".cm-scroller": { overflow: "auto", backgroundColor: "var(--color-background)", fontFamily: "Inter, ui-sans-serif, system-ui", lineHeight: "1.8" },
  ".cm-content": { maxWidth: "768px", width: "100%", margin: "0 auto", padding: "10px 40px 160px", caretColor: "var(--color-primary)" },
  ".cm-line": { padding: "1px 0" },
  ".cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "var(--color-primary)", borderLeftWidth: "2px" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { background: "oklch(0.55 0.235 292 / .28)" },
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { background: "transparent" },
  ".cm-md-syntax": { color: "var(--color-primary)", opacity: ".8" },
  ".cm-md-heading": { color: "var(--color-foreground)", fontWeight: "750", lineHeight: "1.35" },
  ".cm-md-h1": { fontSize: "2rem" },
  ".cm-md-h2": { fontSize: "1.6rem" },
  ".cm-md-h3": { fontSize: "1.3rem" },
  ".cm-md-h4, .cm-md-h5, .cm-md-h6": { fontSize: "1.08rem" },
  ".cm-md-strong": { fontWeight: "750", color: "var(--color-foreground)" },
  ".cm-md-em": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", color: "var(--color-muted-foreground)" },
  ".cm-md-code": { fontFamily: "JetBrains Mono, ui-monospace, monospace", background: "var(--color-surface-2)", color: "oklch(.76 .13 245)", borderRadius: "5px", padding: "2px 5px" },
  ".cm-md-code-block-line": { background: "var(--color-surface-2)", paddingLeft: "16px", paddingRight: "16px" },
  ".cm-md-code-fence-open": { minHeight: "10px", color: "var(--color-muted-foreground)", borderRadius: "8px 8px 0 0", marginTop: "8px" },
  ".cm-md-code-fence-close": { minHeight: "10px", color: "var(--color-muted-foreground)", borderRadius: "0 0 8px 8px", marginBottom: "8px" },
  ".cm-md-code-block-text": { fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace", color: "oklch(.78 .12 245)" },
  ".cm-md-note-link": { color: "var(--color-primary)", textDecoration: "underline", textDecorationColor: "color-mix(in oklch, var(--color-primary) 45%, transparent)", textUnderlineOffset: "3px" },
  ".cm-md-quote": { color: "var(--color-muted-foreground)", fontStyle: "italic", borderLeft: "3px solid var(--color-primary)", paddingLeft: "14px" },
  ".cm-md-list-marker": { display: "inline-block", minWidth: "1.35rem", color: "var(--color-muted-foreground)" },
  "@media (max-width: 768px)": { ".cm-content": { padding: "8px 20px 120px" } },
}, { dark: true });

export function LiveMarkdownEditor({ value, onChange, editorRef, readOnly = false }) {
  const editorFontSize = usePreferences((state) => state.editorFontSize);
  const editorMode = usePreferences((state) => state.editorMode);
  const spellCheck = usePreferences((state) => state.spellCheck);
  const theme = usePreferences((state) => state.theme);
  const [selectionMenu, setSelectionMenu] = useState(null);
  const extensions = useMemo(() => [
    markdown(),
    ...(editorMode === "live-preview" ? [livePreview()] : []),
    editorTheme,
    EditorView.theme({ "&": { fontSize: `${editorFontSize}px` } }),
    EditorView.lineWrapping,
    EditorView.editable.of(!readOnly),
    scrollPastEnd(),
    EditorView.updateListener.of((update) => {
      const selection = update.state.selection.main;
      if (readOnly || selection.empty || !update.view.hasFocus) {
        setSelectionMenu(null);
        return;
      }

      const start = update.view.coordsAtPos(selection.from);
      const end = update.view.coordsAtPos(selection.to);
      if (!start || !end) return;

      const showBelow = Math.min(start.top, end.top) < 70;
      setSelectionMenu({
        left: Math.max(205, Math.min(window.innerWidth - 205, (start.left + end.right) / 2)),
        top: showBelow ? Math.max(start.bottom, end.bottom) + 10 : Math.min(start.top, end.top) - 50,
      });
    }),
  ], [editorFontSize, editorMode, readOnly]);

  useEffect(() => {
    if (editorRef.current) editorRef.current.contentDOM.spellcheck = spellCheck ? "true" : "false";
  }, [spellCheck, editorRef]);

  const wrapSelection = (before, after = before) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    if (from === to) return;
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: `${before}${selected}${after}` },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
      scrollIntoView: true,
    });
    view.focus();
  };

  const prefixLines = (prefix) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const firstLine = view.state.doc.lineAt(from);
    const selected = view.state.sliceDoc(firstLine.from, to);
    const formatted = selected.split("\n").map((line) => `${prefix}${line}`).join("\n");
    view.dispatch({ changes: { from: firstLine.from, to, insert: formatted }, scrollIntoView: true });
    view.focus();
  };

  const actions = [
    [Bold, "Bold", () => wrapSelection("**")],
    [Italic, "Italic", () => wrapSelection("*")],
    [Strikethrough, "Strikethrough", () => wrapSelection("~~")],
    [Heading1, "Heading 1", () => prefixLines("# ")],
    [Heading2, "Heading 2", () => prefixLines("## ")],
    [Heading3, "Heading 3", () => prefixLines("### ")],
    [Link2, "Link", () => wrapSelection("[", "](url)")],
    [Quote, "Quote", () => prefixLines("> ")],
    [Code, "Inline code", () => wrapSelection("`")],
    [List, "Bullet list", () => prefixLines("- ")],
  ];

  return <div className="relative h-full min-h-0">
    <CodeMirror className="echonotes-editor" theme={resolveTheme(theme)} value={value} height="100%" extensions={extensions} basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }} onChange={onChange} onCreateEditor={(view) => { editorRef.current = view; view.contentDOM.spellcheck = spellCheck ? "true" : "false"; }} style={{ fontSize: `${editorFontSize}px` }} placeholder="Start writing your thoughts..." />
    {selectionMenu && <div className="fixed z-[90] flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-elevated p-1.5 shadow-2xl" style={{ left: selectionMenu.left, top: selectionMenu.top }} onMouseDown={(event) => event.preventDefault()}>
      {actions.map(([Icon, label, action], index) => <button key={label} type="button" title={label} onMouseDown={(event) => { event.preventDefault(); action(); }} className={`flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/15 hover:text-primary ${index === 3 || index === 6 ? "ml-1 border-l border-border" : ""}`}><Icon className="size-4" /></button>)}
    </div>}
  </div>;
}
