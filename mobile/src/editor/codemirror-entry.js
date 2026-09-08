import { markdown } from "@codemirror/lang-markdown";
import { RangeSetBuilder } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { Decoration, EditorView, ViewPlugin, WidgetType, keymap, scrollPastEnd } from "@codemirror/view";

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

function addLinks(ranges, line) {
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

class ListMarker extends WidgetType {
  constructor(marker) { super(); this.marker = marker; }
  eq(other) { return other.marker === this.marker; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-list-marker";
    span.textContent = /^\d/.test(this.marker) ? this.marker.trim() : "•";
    return span;
  }
}

function buildDecorations(view) {
  const ranges = [];
  const head = view.state.selection.main.head;
  let inCode = false;
  for (let number = 1; number <= view.state.doc.lines; number += 1) {
    const line = view.state.doc.line(number);
    const active = head >= line.from && head <= line.to;
    const fence = line.text.match(/^\s*```/);
    if (fence) {
      ranges.push([line.from, line.from, Decoration.line({ class: `cm-md-code-block-line ${inCode ? "cm-md-code-fence-close" : "cm-md-code-fence-open"}` })]);
      if (line.to > line.from) ranges.push([line.from, line.to, active ? syntax : hidden]);
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      ranges.push([line.from, line.from, Decoration.line({ class: "cm-md-code-block-line" })]);
      if (line.to > line.from) ranges.push([line.from, line.to, Decoration.mark({ class: "cm-md-code-block-text" })]);
      continue;
    }
    const heading = line.text.match(/^(#{1,6})\s+/);
    if (heading) {
      const markerEnd = line.from + heading[0].length;
      ranges.push([line.from, markerEnd, active ? syntax : hidden]);
      if (markerEnd < line.to) ranges.push([markerEnd, line.to, Decoration.mark({ class: `cm-md-heading cm-md-h${heading[1].length}` })]);
    }
    if (!active) {
      addInline(ranges, line, /\*\*(.+?)\*\*/g, "cm-md-strong");
      addInline(ranges, line, /(?<!\*)\*([^*\n]+)\*(?!\*)/g, "cm-md-em", 1);
      addInline(ranges, line, /~~(.+?)~~/g, "cm-md-strike");
      addInline(ranges, line, /`([^`]+?)`/g, "cm-md-code", 1);
      addInline(ranges, line, /\[\[(.+?)\]\]/g, "cm-md-note-link");
      addLinks(ranges, line);
      const quote = line.text.match(/^>\s+/);
      if (quote) {
        ranges.push([line.from, line.from + quote[0].length, hidden]);
        ranges.push([line.from + quote[0].length, line.to, Decoration.mark({ class: "cm-md-quote" })]);
      }
      const list = line.text.match(/^(\s*)([-*+] |\d+\. )/);
      if (list) {
        const start = line.from + list[1].length;
        ranges.push([start, start + list[2].length, Decoration.replace({ widget: new ListMarker(list[2]) })]);
      }
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const builder = new RangeSetBuilder();
  let last = -1;
  for (const [from, to, decoration] of ranges) {
    if (from < last || to < from) continue;
    builder.add(from, to, decoration);
    last = from;
  }
  return builder.finish();
}

const livePreview = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = buildDecorations(view); }
  update(update) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = buildDecorations(update.view);
  }
}, { decorations: (plugin) => plugin.decorations });

function post(type, data = {}) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...data }));
}

window.EchoNotesEditor = {
  mount(config) {
    const c = config.colors;
    const theme = EditorView.theme({
      "&": { height: "100%", backgroundColor: c.background, color: c.text, fontSize: `${config.fontSize}px` },
      ".cm-scroller": { overflow: "auto", backgroundColor: c.background, fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", lineHeight: "1.8" },
      ".cm-content": { padding: "8px 16px 180px", caretColor: c.primary, minHeight: "100%" },
      ".cm-line": { padding: "1px 0" }, ".cm-focused": { outline: "none" }, ".cm-cursor": { borderLeftColor: c.primary, borderLeftWidth: "2px" },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { background: `${c.primary}55` }, ".cm-gutters": { display: "none" }, ".cm-activeLine": { background: "transparent" },
      ".cm-md-syntax": { color: c.primary, opacity: ".8" }, ".cm-md-heading": { color: c.text, fontWeight: "750", lineHeight: "1.35" },
      ".cm-md-h1": { fontSize: "2em" }, ".cm-md-h2": { fontSize: "1.6em" }, ".cm-md-h3": { fontSize: "1.3em" }, ".cm-md-h4, .cm-md-h5, .cm-md-h6": { fontSize: "1.08em" },
      ".cm-md-strong": { fontWeight: "750" }, ".cm-md-em": { fontStyle: "italic" }, ".cm-md-strike": { textDecoration: "line-through", color: c.muted },
      ".cm-md-code": { fontFamily: "monospace", background: c.raised, color: "#60a5fa", borderRadius: "5px", padding: "2px 5px" },
      ".cm-md-code-block-line": { background: c.raised, paddingLeft: "14px", paddingRight: "14px" }, ".cm-md-code-fence-open": { borderRadius: "8px 8px 0 0", marginTop: "8px" }, ".cm-md-code-fence-close": { borderRadius: "0 0 8px 8px", marginBottom: "8px" },
      ".cm-md-code-block-text": { fontFamily: "monospace", color: "#7dd3fc" }, ".cm-md-note-link": { color: c.primary, textDecoration: "underline" },
      ".cm-md-quote": { color: c.muted, fontStyle: "italic", borderLeft: `3px solid ${c.primary}`, paddingLeft: "12px" }, ".cm-md-list-marker": { display: "inline-block", minWidth: "1.35rem", color: c.muted },
    });
    const view = new EditorView({
      parent: document.getElementById("editor"),
      doc: config.content,
      extensions: [markdown(), history(), keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, scrollPastEnd(), livePreview, theme, EditorView.updateListener.of((update) => {
        if (update.docChanged) post("change", { content: update.state.doc.toString() });
        if (update.selectionSet || update.docChanged) {
          const selection = update.state.selection.main;
          post("selection", { selection: { start: selection.from, end: selection.to } });
        }
      })],
    });
    view.contentDOM.spellcheck = config.spellCheck ? "true" : "false";
    window.echoView = view;
    post("ready");
  },
  setContent(content, start, end) {
    const view = window.echoView;
    if (!view || view.state.doc.toString() === content) return;
    const safeStart = Math.min(start ?? content.length, content.length);
    const safeEnd = Math.min(end ?? safeStart, content.length);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content }, selection: { anchor: safeStart, head: safeEnd }, scrollIntoView: true });
  },
  focus() { window.echoView?.focus(); },
};
