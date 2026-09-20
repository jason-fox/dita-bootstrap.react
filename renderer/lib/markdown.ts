import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveLang(langRaw: string): string {
  const raw = (langRaw || "text").toLowerCase().trim();
  switch (raw) {
    case "html":
    case "xml":
    case "svg":
    case "dita":
    case "xhtml":
    case "markup":
      return "markup";
    case "js":
    case "javascript":
    case "jsx":
      return "javascript";
    case "ts":
    case "typescript":
    case "tsx":
      return "typescript";
    case "sh":
    case "shell":
    case "bash":
    case "zsh":
      return "bash";
    case "json":
      return "json";
    case "css":
      return "css";
    case "c":
      return "c";
    case "cpp":
    case "c++":
      return "cpp";
    default:
      return Prism.languages[raw] ? raw : "markup";
  }
}

function processLists(text: string): string {
  const lines = text.split("\n");
  const resultLines: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let currentItemLines: string[] = [];

  const flushItem = () => {
    if (currentItemLines.length > 0) {
      const content = currentItemLines.join("<br />");
      resultLines.push(`<li class="mb-1">${content}</li>`);
      currentItemLines = [];
    }
  };

  const closeList = () => {
    flushItem();
    if (inList === "ul") {
      resultLines.push("</ul>");
    } else if (inList === "ol") {
      resultLines.push("</ol>");
    }
    inList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const unorderedMatch = line.match(/^(\s*)([\*\-\+])\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)(\d+[\.\)])\s+(.*)$/);

    if (unorderedMatch) {
      if (inList !== "ul") {
        closeList();
        inList = "ul";
        resultLines.push('<ul class="mb-2 ps-3">');
      } else {
        flushItem();
      }
      currentItemLines.push(unorderedMatch[3]);
    } else if (orderedMatch) {
      if (inList !== "ol") {
        closeList();
        inList = "ol";
        resultLines.push('<ol class="mb-2 ps-3">');
      } else {
        flushItem();
      }
      currentItemLines.push(orderedMatch[3]);
    } else if (inList !== null) {
      const isBlank = line.trim() === "";
      const isIndented = /^(\s{2,}|\t)/.test(line);

      if (isBlank) {
        let nextIsList = false;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === "") continue;
          if (/^(\s*)([\*\-\+]|\d+[\.\)])\s+/.test(lines[j])) {
            nextIsList = true;
          }
          break;
        }
        if (!nextIsList) {
          closeList();
          resultLines.push(line);
        }
      } else if (isIndented || currentItemLines.length > 0) {
        currentItemLines.push(line.trim());
      } else {
        closeList();
        resultLines.push(line);
      }
    } else {
      resultLines.push(line);
    }
  }

  closeList();
  return resultLines.join("\n");
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";

  // 1. Extract fenced code blocks (```lang\ncode```)
  const codeBlocks: string[] = [];
  let processed = markdown.replace(/```([a-zA-Z0-9_\-]*)\r?\n([\s\S]*?)```/g, (_, langRaw, code) => {
    const lang = resolveLang(langRaw);
    const rawCode = code.trim();
    let highlightedCode = escapeHtml(rawCode);

    if (Prism.languages[lang]) {
      try {
        highlightedCode = Prism.highlight(rawCode, Prism.languages[lang], lang);
      } catch (e) {
        console.warn(`Prism highlighting failed for ${lang}:`, e);
      }
    }

    const html = `<pre class="language-${lang} my-2 p-3 rounded bg-body-tertiary border overflow-x-auto"><code class="language-${lang}">${highlightedCode}</code></pre>`;
    const placeholder = `%%CODEBLOCK${codeBlocks.length}%%`;
    codeBlocks.push(html);
    return placeholder;
  });

  // 2. Extract inline code (`code`) and escape HTML inside inline code
  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_, codeText) => {
    const placeholder = `%%INLINECODE${inlineCodes.length}%%`;
    inlineCodes.push(escapeHtml(codeText));
    return placeholder;
  });

  // 3. HTML escape remaining plain text so unescaped XML/DITA tags (e.g. <section>, <div>) render properly
  processed = escapeHtml(processed);

  // 4. Horizontal rules (--- or ***)
  processed = processed.replace(/^---$/gim, '<hr class="my-3 border-secondary-subtle" />');
  processed = processed.replace(/^\*\*\*$/gim, '<hr class="my-3 border-secondary-subtle" />');

  // 5. Process headers (# Header through ###### Header)
  processed = processed.replace(/^###### (.*$)/gim, '<h6 class="fw-bold mt-3 mb-2">$1</h6>');
  processed = processed.replace(/^##### (.*$)/gim, '<h6 class="fw-bold mt-3 mb-2">$1</h6>');
  processed = processed.replace(/^#### (.*$)/gim, '<h5 class="fw-bold mt-3 mb-2">$1</h5>');
  processed = processed.replace(/^### (.*$)/gim, '<h5 class="fw-bold mt-3 mb-2">$1</h5>');
  processed = processed.replace(/^## (.*$)/gim, '<h4 class="fw-bold mt-3 mb-2">$1</h4>');
  processed = processed.replace(/^# (.*$)/gim, '<h3 class="fw-bold mt-3 mb-2">$1</h3>');

  // 6. Process bold & italics
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');

  // 7. Process links ([title](url))
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-underline">$1</a>');

  // 8. Process list items (ordered & unordered with multiline support)
  processed = processLists(processed);

  // 9. Convert line breaks to <br /> or paragraphs
  const paragraphs = processed.split(/\n{2,}/);
  processed = paragraphs
    .map((p) => {
      if (
        p.startsWith("<h") ||
        p.startsWith("<ul") ||
        p.startsWith("<ol") ||
        p.startsWith("<hr") ||
        p.startsWith("%%CODEBLOCK")
      ) {
        return p;
      }
      return `<p class="mb-2">${p.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");

  // 10. Restore inline code placeholders
  inlineCodes.forEach((html, i) => {
    const codeTag = `<code class="px-1 py-0.5 rounded bg-body-tertiary border font-monospace me-1">${html}</code>`;
    processed = processed.replace(`%%INLINECODE${i}%%`, codeTag);
  });

  // 11. Restore code block placeholders
  codeBlocks.forEach((html, i) => {
    processed = processed.replace(`%%CODEBLOCK${i}%%`, html);
  });

  return processed;
}
