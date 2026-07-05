/** Shared section header patterns for figure injection & extraction */
export const SCENE_SECTION_RE = /##\s*(?:\d+\.\s*)?(?:这是个什么场景|场景)[^\n]*/;
export const METHOD_SECTION_RE = /##\s*(?:\d+\.\s*)?(?:它分几步做的(?:（方法）)?|它怎么做的|方法|这篇论文的关键想法|关键想法|新想法)[^\n]*/;

export function extractSectionParagraph(content, sectionRe) {
  const header = content.match(sectionRe);
  if (!header) return null;
  const start = content.indexOf(header[0]) + header[0].length;
  const rest = content.slice(start);
  const end = rest.search(/\n## /);
  const block = end === -1 ? rest : rest.slice(0, end);
  const text = block
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith(">") && !l.startsWith("*") && !l.startsWith("```") && !l.startsWith("<!--"))
    .join(" ")
    .replace(/\*\*/g, "")
    .slice(0, 400);
  return text.trim() || null;
}

export function injectAfterSection(body, sectionRe, markdown) {
  const re = new RegExp(
    `(${sectionRe.source}[^\\n]*\\n[\\s\\S]*?)(?=\\n## )`,
  );
  return body.replace(re, (m) => m + markdown);
}
