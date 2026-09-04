import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { useMemo } from "react";

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

function buildDecorations(view) {
  const ranges = [];
  const activeHead = view.state.selection.main.head;

  for (let lineNumber = 1; lineNumber <= view.state.doc.lines; lineNumber += 1) {
    const line = view.state.doc.line(lineNumber);
    const active = activeHead >= line.from && activeHead <= line.to;
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
      addInline(ranges, line, /~~(.+?)~~/g, "cm-md-strike");
      addInline(ranges, line, /`([^`]+?)`/g, "cm-md-code", 1);

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
    if (from < lastFrom || to <= from) continue;
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
  ".cm-md-strike": { textDecoration: "line-through", color: "var(--color-muted-foreground)" },
  ".cm-md-code": { fontFamily: "JetBrains Mono, ui-monospace, monospace", background: "var(--color-surface-2)", color: "oklch(.76 .13 245)", borderRadius: "5px", padding: "2px 5px" },
  ".cm-md-quote": { color: "var(--color-muted-foreground)", fontStyle: "italic", borderLeft: "3px solid var(--color-primary)", paddingLeft: "14px" },
  ".cm-md-list-marker": { display: "inline-block", minWidth: "1.35rem", color: "var(--color-muted-foreground)" },
  "@media (max-width: 768px)": { ".cm-content": { padding: "8px 20px 120px" } },
}, { dark: true });

export function LiveMarkdownEditor({ value, onChange, editorRef }) {
  const extensions = useMemo(() => [markdown(), livePreview(), editorTheme, EditorView.lineWrapping], []);
  return <CodeMirror className="echonotes-editor" theme="dark" value={value} height="100%" extensions={extensions} basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }} onChange={onChange} onCreateEditor={(view) => { editorRef.current = view; }} placeholder="Start writing your thoughts..." />;
}
