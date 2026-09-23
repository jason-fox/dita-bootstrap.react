export interface MarkdownChunk {
  chunkId: string;
  topicPath: string;
  docId: string;
  title: string;
  shortdesc: string;
  sectionTitle: string;
  content: string;
  lang?: string;
}

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
    const lines = markdown.split("\n");
    const chunks: MarkdownChunk[] = [];

    let currentSectionTitle = title;
    let currentLines: string[] = [];
    let chunkIndex = 0;

    const flush = () => {
      const text = currentLines.join("\n").trim();
      if (text.length > 0) {
        chunks.push({
          chunkId: `${docId}:${topicPath}:${chunkIndex++}`,
          docId,
          topicPath,
          title,
          shortdesc,
          sectionTitle: currentSectionTitle,
          content: text,
          lang,
        });
      }
      currentLines = [];
    };

    for (const line of lines) {
      if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
        flush();
        currentSectionTitle = line.replace(/^#+\s*/, "").trim();
      } else {
        currentLines.push(line);
      }
    }
    flush();

    return chunks.length > 0
      ? chunks
      : [
          {
            chunkId: `${docId}:${topicPath}:0`,
            docId,
            topicPath,
            title,
            shortdesc,
            sectionTitle: title,
            content: markdown.trim(),
            lang,
          },
        ];
  }
}
