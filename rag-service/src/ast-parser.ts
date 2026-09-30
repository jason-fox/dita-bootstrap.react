export interface MarkdownChunk {
  chunkId: string;
  topicPath: string;
  docId: string;
  title: string;
  shortdesc: string;
  sectionTitle: string;
  anchor?: string;
  content: string;
  lang?: string;
}

const MAX_CHUNK_CHARS = 1800;
const MIN_CHUNK_CHARS = 200;
const CHUNK_OVERLAP_CHARS = 200;

export class AstParser {
  public static astToMarkdown(node: unknown): string {
    if (node === null || node === undefined) return "";
    if (typeof node === "string") return node;
    if (!Array.isArray(node) || node.length === 0) return "";

    const [type, maybeProps, ...rest] = node;
    const isProps =
      typeof maybeProps === "object" &&
      maybeProps !== null &&
      !Array.isArray(maybeProps);

    const props = isProps ? (maybeProps as Record<string, unknown>) : {};
    const children = (isProps ? rest : [maybeProps, ...rest]).filter(
      (child) => child !== undefined,
    );

    const childText = children.map((c) => this.astToMarkdown(c)).join("");
    const tag = String(type).toLowerCase();

    switch (tag) {
      case "topic":
      case "concept":
      case "task":
      case "reference":
      case "div":
      case "article":
      case "main":
      case "body":
      case "section":
        return `\n${childText}\n`;

      case "title":
      case "h1":
        return `\n# ${childText.trim()}\n\n`;
      case "h2":
        return `\n## ${childText.trim()}\n\n`;
      case "h3":
        return `\n### ${childText.trim()}\n\n`;
      case "h4":
        return `\n#### ${childText.trim()}\n\n`;

      case "shortdesc":
      case "p":
        return `\n${childText.trim()}\n\n`;

      case "strong":
      case "b":
        return `**${childText}**`;

      case "em":
      case "i":
        return `*${childText}*`;

      case "code":
        return childText.includes("\n") ? `\n\`\`\`\n${childText}\n\`\`\`\n` : `\`${childText}\``;

      case "codeblock":
      case "pre": {
        const rawLang = (props.outputclass as string) || (props.language as string) || (props.lang as string) || "text";
        const lang = rawLang.replace(/^language-/, "").trim();
        return `\n\`\`\`${lang}\n${childText}\n\`\`\`\n`;
      }

      case "ul":
        return `\n${children.map((c) => `- ${this.astToMarkdown(c).trim()}`).join("\n")}\n`;

      case "ol":
        return `\n${children.map((c, i) => `${i + 1}. ${this.astToMarkdown(c).trim()}`).join("\n")}\n`;

      case "li":
        return childText;

      case "a":
      case "xref": {
        const href = (props.href as string) || "#";
        return `[${childText || href}](${href})`;
      }

      case "alert":
      case "note": {
        const variant = (props.variant as string) || (props.type as string) || "note";
        return `\n> **${variant.toUpperCase()}:** ${childText}\n`;
      }

      default:
        return childText ? ` ${childText} ` : "";
    }
  }

  public static chunkMarkdown(
    markdown: string,
    docId: string,
    topicPath: string,
    title: string,
    shortdesc: string,
    lang?: string
  ): MarkdownChunk[] {
    const sections: { sectionTitle: string; text: string }[] = [];
    let sectionTitle = title;
    let lines: string[] = [];

    const closeSection = () => {
      const text = lines.join("\n").trim();
      if (text) sections.push({ sectionTitle, text });
      lines = [];
    };

    for (const line of markdown.split("\n")) {
      if (/^#{1,3}\s/.test(line)) {
        closeSection();
        sectionTitle = line.replace(/^#+\s*/, "").trim();
      } else {
        lines.push(line);
      }
    }
    closeSection();

    const pieces: { sectionTitle: string; text: string }[] = [];
    for (const section of sections) {
      for (const text of this.splitOversized(section.text)) {
        const prev = pieces[pieces.length - 1];
        const combined = prev ? prev.text.length + section.sectionTitle.length + text.length + 4 : 0;
        const tiny = text.length < MIN_CHUNK_CHARS || (prev && prev.text.length < MIN_CHUNK_CHARS);
        if (prev && tiny && combined <= MAX_CHUNK_CHARS) {
          prev.text += `\n\n${section.sectionTitle}\n${text}`;
        } else {
          pieces.push({ sectionTitle: section.sectionTitle, text });
        }
      }
    }

    if (pieces.length === 0) {
      pieces.push({ sectionTitle: title, text: markdown.trim() });
    }

    return pieces.map((piece, i) => ({
      chunkId: `${docId}:${topicPath}:${i}`,
      docId,
      topicPath,
      title,
      shortdesc,
      sectionTitle: piece.sectionTitle,
      anchor: this.slugify(piece.sectionTitle),
      content: piece.text,
      lang,
    }));
  }

  private static slugify(text: string): string {
    return text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  }

  private static splitOversized(text: string): string[] {
    if (text.length <= MAX_CHUNK_CHARS) return [text];

    const paragraphs = text.split(/\n{2,}/).flatMap((para) => {
      const parts: string[] = [];
      for (let start = 0; start < para.length; start += MAX_CHUNK_CHARS) {
        parts.push(para.slice(start, start + MAX_CHUNK_CHARS));
      }
      return parts;
    });

    const out: string[] = [];
    let current = "";
    for (const para of paragraphs) {
      if (current && current.length + para.length + 2 > MAX_CHUNK_CHARS) {
        out.push(current);
        const tail = current.split(/\n{2,}/).pop() ?? "";
        current = tail.length <= CHUNK_OVERLAP_CHARS ? tail : "";
      }
      current = current ? `${current}\n\n${para}` : para;
    }
    if (current.trim()) out.push(current);
    return out;
  }
}
