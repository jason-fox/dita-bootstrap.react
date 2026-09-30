// Vendored from ../../../frontend/app/prism-theme.css (itself vendored from
// plugins/fox.jason.prismjs/css/bootstrap-theme.css + css/style.css) so the standalone
// MCP-UI HTML resource doesn't depend on a runtime filesystem path into the frontend package.
export const PRISM_THEME_CSS = `
:root {
  --prism-maintext: var(
    --bs-theme-fg-emphasis,
    var(--bs-secondary-text-emphasis, #000)
  );
  --prism-background: var(
    --bs-theme-bg,
    var(--bs-bg-transparent, var(--bs-secondary-bg-subtle, #f5f2f0))
  );
  --prism-text: var(--bs-gray-500, #999);
  --prism-punctuation: var(--bs-gray-500, var(--bs-gray, #999));
  --prism-namespace: var(--prism-text);
  --prism-keywords: var(--bs-blue-500, var(--bs-blue, #07a));
  --prism-strings: var(--bs-green-500, var(--bs-green, #690));
  --prism-symbol: var(--bs-pink-500, var(--bs-pink, #905));
  --prism-type: var(--bs-red-500, var(--bs-red, #dd4a68));
  --prism-regex: var(--bs-orange-500, var(--bs-orange, #e90));
  --prism-deleted: var(--bs-red-500, var(--bs-red, red));
  --prism-url: var(--bs-yellow-500, var(--bs-yellow, #9a6e3a));
}

code[class*="language-"],
pre[class*="language-"] {
  color: var(--prism-maintext, #ccc);
  background: none;
  font-family: var(
    --bs-font-monospace,
    Consolas,
    Monaco,
    "Andale Mono",
    "Ubuntu Mono",
    monospace
  );
  font-size: 1em;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.5;
  tab-size: 4;
  hyphens: none;
}

pre[class*="language-"] {
  padding: 1em;
  margin: 0.5em 0;
  overflow: auto;
  background: var(--prism-background, #2d2d2d);
}

:not(pre) > code[class*="language-"] {
  padding: 0.1em;
  border-radius: 0.3em;
  white-space: normal;
}

.token.comment,
.token.block-comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: var(--prism-text, #999);
}

.token.punctuation {
  color: var(--prism-punctuation, #ccc);
}

.token.namespace {
  color: var(--prism-namespace, #999);
  opacity: 0.7;
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: var(--prism-keywords, #cc99cd);
}

.token.attr-name,
.token.builtin,
.token.char,
.token.inserted,
.token.selector,
.token.string,
.token.variable {
  color: var(--prism-strings, #7ec699);
}

.token.boolean,
.token.constant,
.token.number,
.token.property,
.token.symbol,
.token.tag {
  color: var(--prism-symbol, #f8c555);
}

.token.class-name,
.token.function {
  color: var(--prism-type, #dd4a68);
}

.token.important,
.token.regex {
  color: var(--prism-regex, #e90);
}

.token.deleted {
  color: var(--prism-deleted, red);
}

.token.operator,
.token.entity,
.token.url {
  color: var(--prism-url, #67cdcc);
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;
