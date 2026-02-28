import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { T } from "@shared/styles/tokens";

interface MarkdownContentProps {
  content: string;
  variant?: "document" | "compact";
}

const STYLE_TAG_DOCUMENT = `
.vc-md h1 {
  font-size: 22px;
  font-weight: 700;
  color: ${T.primary};
  font-family: ${T.serif};
  border-left: 3px solid ${T.accent};
  background: #f0fdf4;
  padding: 10px 14px;
  margin: 28px 0 14px;
  line-height: 1.35;
  border-radius: 0 6px 6px 0;
}
.vc-md h1:first-child { margin-top: 0; }
.vc-md h2 {
  font-size: 17px;
  font-weight: 700;
  color: ${T.primary};
  font-family: ${T.serif};
  border-bottom: 1px solid ${T.border};
  padding-bottom: 8px;
  margin: 24px 0 10px;
  line-height: 1.35;
}
.vc-md h3 {
  font-size: 14.5px;
  font-weight: 700;
  color: ${T.accent};
  font-family: ${T.serif};
  margin: 20px 0 8px;
  line-height: 1.4;
}
.vc-md p {
  font-size: 13.5px;
  color: ${T.ink2};
  line-height: 1.8;
  margin: 0 0 10px;
}
.vc-md strong { font-weight: 700; }
.vc-md em { font-style: italic; }
.vc-md ul, .vc-md ol {
  padding-left: 24px;
  margin: 6px 0 12px;
}
.vc-md li {
  font-size: 13.5px;
  color: ${T.ink2};
  line-height: 1.8;
  margin-bottom: 4px;
}
.vc-md hr {
  border: none;
  border-top: 1px solid ${T.border};
  margin: 18px 0;
}
.vc-md table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 12px 0;
  font-size: 12.5px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.vc-md th {
  text-align: left;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #fff;
  padding: 9px 10px;
  background: #0f3d2e;
}
.vc-md td {
  padding: 7px 10px;
  border-bottom: 1px solid ${T.borderL};
  color: ${T.ink2};
}
.vc-md tr:nth-child(even) td {
  background: #f9fafb;
}
.vc-md blockquote {
  border-left: 4px solid ${T.accent};
  background: #f0fdf4;
  margin: 12px 0;
  padding: 10px 16px;
  border-radius: 0 6px 6px 0;
}
.vc-md blockquote p {
  margin: 0;
  color: ${T.ink2};
}
.vc-md blockquote.vc-callout-info {
  border-left: 4px solid ${T.accent};
  background: #f0fdf4;
}
.vc-md blockquote.vc-callout-warn {
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
}
.vc-md blockquote.vc-callout-legal {
  border-left: 4px solid #9ca3af;
  background: #f9fafb;
  font-style: italic;
}
.vc-md li input[type="checkbox"] {
  accent-color: ${T.accent};
  margin-right: 6px;
  transform: scale(1.1);
  vertical-align: middle;
}
.vc-md code {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px;
  background: ${T.s2};
  padding: 2px 5px;
  border-radius: 4px;
  color: ${T.ink};
}
.vc-md pre {
  background: ${T.s2};
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 10px 0;
}
.vc-md pre code {
  background: none;
  padding: 0;
  font-size: 12px;
  line-height: 1.6;
}
.vc-md a {
  color: ${T.accent};
  text-decoration: underline;
}
`;

const STYLE_TAG_COMPACT = `
.vc-md-compact h1 {
  font-size: 18px;
  font-weight: 700;
  color: ${T.ink};
  font-family: ${T.sans};
  border-bottom: 1px solid ${T.borderL};
  padding-bottom: 6px;
  margin: 20px 0 10px;
  line-height: 1.35;
}
.vc-md-compact h1:first-child { margin-top: 0; }
.vc-md-compact h2 {
  font-size: 15px;
  font-weight: 700;
  color: ${T.ink};
  font-family: ${T.sans};
  margin: 16px 0 8px;
  line-height: 1.35;
}
.vc-md-compact h3 {
  font-size: 13.5px;
  font-weight: 700;
  color: ${T.ink2};
  font-family: ${T.sans};
  margin: 14px 0 6px;
  line-height: 1.4;
}
.vc-md-compact p {
  font-size: 13px;
  color: ${T.ink2};
  line-height: 1.7;
  margin: 0 0 8px;
}
.vc-md-compact strong { font-weight: 700; }
.vc-md-compact em { font-style: italic; }
.vc-md-compact ul, .vc-md-compact ol {
  padding-left: 22px;
  margin: 4px 0 10px;
}
.vc-md-compact li {
  font-size: 13px;
  color: ${T.ink2};
  line-height: 1.7;
  margin-bottom: 2px;
}
.vc-md-compact hr {
  border: none;
  border-top: 1px solid ${T.borderL};
  margin: 14px 0;
}
.vc-md-compact table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 12px;
}
.vc-md-compact th {
  text-align: left;
  font-weight: 700;
  color: ${T.ink};
  padding: 6px 8px;
  border-bottom: 2px solid ${T.border};
  background: ${T.s1};
}
.vc-md-compact td {
  padding: 5px 8px;
  border-bottom: 1px solid ${T.borderL};
  color: ${T.ink2};
}
.vc-md-compact blockquote {
  border-left: 3px solid ${T.accent};
  background: ${T.accentS};
  margin: 8px 0;
  padding: 8px 14px;
  border-radius: 0 6px 6px 0;
}
.vc-md-compact blockquote p { margin: 0; }
.vc-md-compact code {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 11.5px;
  background: ${T.s2};
  padding: 2px 5px;
  border-radius: 4px;
  color: ${T.ink};
}
.vc-md-compact pre {
  background: ${T.s2};
  border-radius: 8px;
  padding: 12px 14px;
  overflow-x: auto;
  margin: 8px 0;
}
.vc-md-compact pre code {
  background: none;
  padding: 0;
}
.vc-md-compact a {
  color: ${T.accent};
  text-decoration: underline;
}
`;

export function MarkdownContent({ content, variant = "document" }: MarkdownContentProps) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { async: false }) as string;
    const sanitized = DOMPurify.sanitize(raw, { ADD_ATTR: ["class"] });
    // Post-process: add callout classes to blockquotes starting with keyword
    const processed = sanitized
      .replace(/<blockquote>\s*<p>\s*<strong>Wichtig:/g, '<blockquote class="vc-callout-info"><p><strong>Wichtig:')
      .replace(/<blockquote>\s*<p>\s*<strong>Achtung:/g, '<blockquote class="vc-callout-warn"><p><strong>Achtung:')
      .replace(/<blockquote>\s*<p>\s*<strong>Rechtsgrundlage:/g, '<blockquote class="vc-callout-legal"><p><strong>Rechtsgrundlage:');
    return processed;
  }, [content]);

  const isCompact = variant === "compact";
  const className = isCompact ? "vc-md-compact" : "vc-md";
  const styleTag = isCompact ? STYLE_TAG_COMPACT : STYLE_TAG_DOCUMENT;

  return (
    <>
      <style>{styleTag}</style>
      <div
        className={className}
        style={{
          fontFamily: isCompact ? T.sans : T.serif,
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
