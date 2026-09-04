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
