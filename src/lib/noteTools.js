export function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => String(tag).trim().replace(/^#/, "").toLowerCase()).filter(Boolean))].slice(0, 12);
}

export function noteLinks(content = "") {
  return [...new Set([...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean))];
}

export function safeFilename(title = "Untitled Note") {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "Untitled Note";
}

export function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function noteAsMarkdown(note) {
  const tags = normalizeTags(note.tags);
  return `${tags.length ? `---\ntags: [${tags.join(", ")}]\n---\n\n` : ""}# ${note.title || "Untitled Note"}\n\n${note.content || ""}`;
}

export function parseImportedNote(filename, text) {
  const fallbackTitle = filename.replace(/\.(md|markdown|txt)$/i, "") || "Imported Note";
  const tagMatch = text.match(/^---\s*\n[\s\S]*?tags:\s*\[([^\]]*)\][\s\S]*?\n---\s*\n?/i);
  const withoutFrontmatter = tagMatch ? text.slice(tagMatch[0].length) : text;
  const heading = withoutFrontmatter.match(/^#\s+(.+)$/m);
  const content = heading && heading.index === 0 ? withoutFrontmatter.slice(heading[0].length).replace(/^\s*\n/, "") : withoutFrontmatter;
  return {
    title: heading?.[1]?.trim() || fallbackTitle,
    content,
    tags: normalizeTags(tagMatch?.[1]?.split(",") ?? []),
  };
}

const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function printableMarkdown(content = "") {
  const inline = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[\[(.+?)\]\]/g, "<span class=\"note-link\">$1</span>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  let inCode = false;
  return content.split("\n").map((line) => {
    if (line.startsWith("```")) { inCode = !inCode; return inCode ? "<pre><code>" : "</code></pre>"; }
    if (inCode) return `${escapeHtml(line)}\n`;
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    if (heading) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    if (/^---+$/.test(line.trim())) return "<hr>";
    if (line.startsWith("> ")) return `<blockquote>${inline(line.slice(2))}</blockquote>`;
    const task = line.match(/^- \[([ xX])\] (.*)/);
    if (task) return `<p class=\"list\">${task[1] === " " ? "☐" : "☑"} ${inline(task[2])}</p>`;
    const bullet = line.match(/^[-*+] (.*)/);
    if (bullet) return `<p class=\"list\">• ${inline(bullet[1])}</p>`;
    return line ? `<p>${inline(line)}</p>` : "<div class=\"space\"></div>";
  }).join("");
}

export function printNoteAsPdf(note) {
  const popup = window.open("", "_blank");
  if (!popup) return false;
  popup.opener = null;
  const title = escapeHtml(safeFilename(note.title));
  const tags = normalizeTags(note.tags).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("");
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:22mm}*{box-sizing:border-box}body{max-width:760px;margin:0 auto;color:#17151c;font:16px/1.7 Arial,sans-serif}h1{font-size:30px;line-height:1.2}h2{font-size:24px}h3{font-size:20px}p{margin:8px 0}.meta{color:#6f6878;font-size:12px}.tags{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 28px}.tags span{background:#eee9f8;color:#6335a5;border-radius:5px;padding:3px 7px;font-size:11px}blockquote{border-left:3px solid #7137d8;margin:14px 0;padding-left:14px;color:#5e5865;font-style:italic}pre{background:#f2f0f5;border-radius:8px;padding:14px;white-space:pre-wrap}code{font-family:Consolas,monospace;background:#f2f0f5;padding:2px 4px;border-radius:4px}.note-link{color:#7137d8}.list{padding-left:12px}.space{height:12px}hr{border:0;border-top:1px solid #ddd6e6;margin:24px 0}</style></head><body><h1>${title}</h1><p class="meta">Exported from EchoNotes · ${new Date().toLocaleString()}</p>${tags ? `<div class="tags">${tags}</div>` : ""}<main>${printableMarkdown(note.content)}</main><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
  popup.document.close();
  return true;
}
