// Vendored from renderer/app/ (*.css) so mcp-server standalone HTML renders
// with 1-to-1 visual fidelity matching the DITA Bootstrap renderer portal.

export const DITA_STYLES_CSS = `
/* --- bootswatch-colors.css --- */
:root {
  --dita-prussian-blue: var(--bs-primary-text-emphasis);
  --dita-maroon: var(--bs-danger-text-emphasis);
  --dita-violet: var(--bs-purple);
  --bs-code-color: rgb(from var(--bs-danger) r g calc(b + 63));
}

/* --- bootswatch-static.css (dark-mode-only override) --- */
[data-bs-theme="dark"] {
  --dita-prussian-blue: #6a91cf;
  --dita-violet: #cc99cd;
  --dita-maroon: #ff7676;
}

/* --- common-bootstrap.css --- */
.list-group-item.active,
.nav-link.active,
[data-bs-theme="dark"] {
  --dita-violet: #cc99cd;
}

.list-group-item {
  border-radius: 0;
}

.tab-pane pre[class*="language-"] {
  margin: 0;
}

.d-dark,
.d-light {
  display: none;
}

[data-bs-theme="light"] .d-light {
  display: inherit;
}

[data-bs-theme="light"] .d-auto {
  display: none;
}

[data-bs-theme="dark"] .d-dark {
  display: inherit;
}

[data-bs-theme="dark"] .d-auto {
  display: none;
}

@media (prefers-color-scheme: dark) {
  :root {
    --dita-violet: #cc99cd;
  }

  [data-bs-theme="light"] {
    --dita-violet: var(--bs-purple);
  }
}

.syntaxdiagram {
  color: var(--dita-maroon);
}

.numcharref,
.parameterentity,
.textentity,
.xmlatt,
.xmlelement,
.xmlnsname,
.xmlpi {
  font-family: var(--bs-font-monospace);
  color: var(--dita-violet);
  overflow-wrap: break-word;
}

.cmdname,
.codeph,
.filepath,
.option,
.parmname {
  font-family: var(--bs-font-monospace);
  color: var(--bs-code-color);
  overflow-wrap: break-word;
}

.cmdname,
.parmname {
  font-weight: 700;
  color: var(--dita-prussian-blue);
}

.nav-pills .active .cmdname,
.nav-pills .active .codeph,
.nav-pills .active .filepath,
.nav-pills .active .option,
.nav-pills .active .parmname,
.nav-pills .active .numcharref,
.nav-pills .active .parameterentity,
.nav-pills .active .textentity,
.nav-pills .active .xmlatt,
.nav-pills .active .xmlelement,
.nav-pills .active .xmlnsname,
.nav-pills .active .xmlpi {
  color: var(--bs-nav-pills-link-active-color);
}

.boolean {
  color: var(--bs-green);
}

.state {
  color: var(--bs-red);
}

.navbar-brand > svg {
  margin: 4px 6px;
  vertical-align: text-top;
}

.bs-container {
  margin: 3rem auto;
}

.bs-sidebar-nav {
  overflow: auto;
}

[type="search"]::placeholder {
  color: rgba(var(--bs-body-color-rgb), 0.3);
}

.search-box:hover,
.search-box:focus-visible {
  outline: -webkit-focus-ring-color auto 1px;
}

.note {
  border-left: 6px solid;
  border-left-color: var(--bs-alert-color, transparent);
}

[dir="rtl"] .note {
  border-right: 6px solid;
  border-right-color: var(--bs-alert-color, transparent);
  border-left: 0;
}

/* --- commonltr.css --- */
.frame-top { border-top: solid 1px; border-right: 0; border-bottom: 0; border-left: 0; }
.frame-bottom { border-top: 0; border-right: 0; border-bottom: solid 1px; border-left: 0; }
.frame-topbot { border-top: solid 1px; border-right: 0; border-bottom: solid 1px; border-left: 0; }
.frame-all { border: solid 1px; }
.frame-sides { border-top: 0; border-left: solid 1px; border-right: solid 1px; border-bottom: 0; }
.frame-none { border: 0; }
.scale-50 { font-size: 50%; }
.scale-60 { font-size: 60%; }
.scale-70 { font-size: 70%; }
.scale-80 { font-size: 80%; }
.scale-90 { font-size: 90%; }
.scale-100 { font-size: 100%; }
.scale-110 { font-size: 110%; }
.scale-120 { font-size: 120%; }
.scale-140 { font-size: 140%; }
.scale-160 { font-size: 160%; }
.scale-180 { font-size: 180%; }
.scale-200 { font-size: 200%; }
.expanse-page, .expanse-spread { width: 100%; }
.hazardstatement td, .hazardstatement th { padding: 0.5rem; }
.hazardstatement th { text-align: center; text-transform: uppercase; }
.hazardstatement--caution { background-color: #ffd100; }
.hazardstatement--danger { background-color: #c8102e; color: #fff; }
.hazardstatement--warning { background-color: #ff8200; }
.hazardstatement--attention, .hazardstatement--fastpath, .hazardstatement--important,
.hazardstatement--note, .hazardstatement--notice, .hazardstatement--other,
.hazardstatement--remember, .hazardstatement--restriction, .hazardstatement--tip {
  background-color: #0072ce; color: #fff; font-style: italic;
}
.line-through { text-decoration: line-through; }
.overline { text-decoration: overline; }
.tt { font-family: monospace; }
.codeblock { font-family: monospace; }
.syntaxdiagram { border: 1 black solid; color: maroon; display: block; margin-bottom: 6pt; padding: 2pt; }
.codeph { font-family: monospace; }
.kwd { font-weight: bold; }
.parmname { font-weight: bold; }
.var { font-style: italic; }
.filepath { font-family: monospace; }
.tasklabel { font-size: 100%; margin-bottom: 1em; margin-top: 1em; }
.lq div { text-align: right; }
.boolean { color: green; }
.state { color: red; }
.screen { background-color: #ccc; border: outset; margin-bottom: 2px; margin-top: 2px; padding: 5px; white-space: pre; }
.wintitle { font-weight: bold; }
.numcharref { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.parameterentity { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.textentity { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.xmlatt { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.xmlelement { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.xmlnsname { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.xmlpi { color: #639; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
.figcap { font-style: italic; }
.figdesc { font-style: normal; }
.figborder { border-color: Silver; border-style: solid; border-width: 2px; margin-top: 1em; padding-left: 3px; padding-right: 3px; }
.figsides { border-color: Silver; border-left: 2px solid; border-right: 2px solid; margin-top: 1em; padding-left: 3px; padding-right: 3px; }
.figtop { border-color: Silver; border-top: 2px solid; margin-top: 1em; }
.figbottom { border-bottom: 2px solid; border-color: Silver; }
.figtopbot { border-bottom: 2px solid; border-color: Silver; border-top: 2px solid; margin-top: 1em; }
div.imageleft { text-align: left; }
div.imagecenter { text-align: center; }
div.imageright { text-align: right; }
div.imagejustify { text-align: justify; }
.topictitle1 { font-size: 1.34em; margin-bottom: 0.1em; margin-top: 0; }
.topictitle2 { font-size: 1.17em; margin-bottom: 0.45em; margin-top: 1pc; }
.topictitle3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.17em; margin-top: 1pc; }
.topictitle4 { font-size: 1.17em; font-weight: bold; margin-top: 0.83em; }
.topictitle5 { font-size: 1.17em; font-weight: bold; }
.topictitle6 { font-size: 1.17em; font-style: italic; }
.sectiontitle { font-size: 1.17em; font-weight: bold; margin-bottom: 0; margin-top: 1em; }
.section { margin-bottom: 1em; margin-top: 1em; }
.example { margin-bottom: 1em; margin-top: 1em; }
.indexterm { background-color: #fdf; border: 1pt #000 solid; margin: 1pt; }
.ullinks { list-style-type: none; }
.ulchildlink { margin-bottom: 1em; margin-top: 1em; }
.olchildlink { margin-bottom: 1em; margin-top: 1em; }
.linklist { margin-bottom: 1em; }
ul.linklist { margin-top: 0; list-style-type: none; padding-left: 0; }
li.linklist { margin-top: 0; margin-bottom: 0; }
.linklistwithchild { margin-bottom: 1em; margin-left: 1.5em; }
.sublinklist { margin-bottom: 1em; margin-left: 1.5em; }
.relconcepts, .reltasks, .relref, .relinfo { margin-bottom: 1em; margin-top: 1em; }
.breadcrumb { font-size: smaller; margin-bottom: 1em; }
.ul.simple { list-style-type: none; }
.dlterm { font-weight: bold; }
.dltermexpand { font-weight: bold; margin-top: 1em; }
*[compact="yes"] > li { margin-top: 0; }
*[compact="no"] > li { margin-top: 0.53em; }
.compact > li { margin-top: 0; }
.liexpand, .sliexpand, .dlexpand, .ddexpand, .stepexpand, .substepexpand { margin-bottom: 1em; margin-top: 1em; }
dt.prereq { margin-left: 20px; }
.note { margin-bottom: 1em; margin-top: 1em; }
.note .notetitle, .note .notelisttitle, .note .note__title { font-weight: bold; }
.note .note__body { display: inline; }
.bold { font-weight: bold; }
.bolditalic { font-style: italic; font-weight: bold; }
.italic { font-style: italic; }
.underlined { text-decoration: underline; }
.uicontrol { font-weight: bold; }
.defkwd { font-weight: bold; text-decoration: underline; }
.shortcut { text-decoration: underline; }
.menucascade > abbr { text-decoration: none; }
table { border-collapse: collapse; }
table .desc { display: block; font-style: italic; }
.table--pgwide-1 { width: 100%; }
.align-left { text-align: left; }
.align-right { text-align: right; }
.align-center { text-align: center; }
.align-justify { text-align: justify; }
.align-char { text-align: char; }
.valign-top { vertical-align: top; }
.valign-bottom { vertical-align: bottom; }
.valign-middle { vertical-align: middle; }
.colsep-0 { border-right: 0; }
.colsep-1 { border-right: 1px solid; }
.rowsep-0 { border-bottom: 0; }
.rowsep-1 { border-bottom: 1px solid; }
.entry.rotate { writing-mode: vertical-rl; }
.stentry { border-right: 1px solid; border-bottom: 1px solid; }
.stentry:last-child { border-right: 0; }
.strow:last-child .stentry { border-bottom: 0; }
.nested0 { margin-top: 1em; }
.p { margin-top: 1em; }
.flag__style--italics { font-style: italic; }
.flag__style--bold { font-weight: bold; }
.flag__style--underline { text-decoration: underline; }
.flag__style--double-underline { text-decoration: double-underline; }
.flag__style--overline { text-decoration: overline; }

/* --- collapsible-toc.css --- */
.bd-links {
  padding-left: none;
  overflow: auto;
  font-weight: 600;
}
.bd-links a {
  padding: 0.1875rem 0.5rem;
  margin-top: 0.125rem;
  color: var(--bs-body-color);
  text-decoration: none;
}
.bd-links a:hover {
  color: var(--bs-link-hover-color);
}
.bd-links span {
  color: var(--bs-body-color);
}
.bd-links span:hover {
  color: var(--bs-link-hover-color);
}
.bd-links span.bd-divider:hover {
  color: var(--bs-body-color);
}
@media (min-width: 768px) {
  .bd-links {
    position: sticky;
    display: block !important;
    padding: 0 0.25rem;
  }
}
@media (max-width: 767.98px) {
  .bd-links > ul {
    padding: 1.5rem 0.75rem;
    background-color: var(--bs-body-bg);
  }
}
.bd-links li li a {
  font-size: 0.875em;
}
.bd-divider {
  font-size: 0.875em;
  font-weight: 600;
}
.bd-links .btn {
  padding: 0.25rem !important;
  font-weight: 600;
  color: var(--bs-body-color);
  background-color: transparent;
  box-shadow: none;
}
.bd-links svg:hover {
  color: var(--bs-link-hover-color);
}
.bd-links .ps-2 { padding-left: 0.5rem !important; }
[dir="rtl"] .bd-links .ps-2 { padding-right: 0.5rem !important; padding-left: 0 !important; }
.bd-links .ps-3 { padding-left: 0.75rem !important; }
[dir="rtl"] .bd-links .ps-3 { padding-right: 0.75rem !important; padding-left: 0 !important; }
.bd-links .ps-4 { padding-left: 1rem !important; }
[dir="rtl"] .bd-links .ps-4 { padding-right: 1rem !important; padding-left: 0 !important; }
[dir="rtl"] .bd-links svg { transform: rotate(180deg); }
.bd-links .btn[aria-expanded="true"] svg { transform: rotate(90deg); }
.bd-links .btn:focus-visible { outline: -webkit-focus-ring-color auto 1px; }
.bd-links .active { font-weight: 600; color: var(--bs-body-color); }

/* --- side-toc.css --- */
.bs-container {
  display: grid;
  grid-template-areas: "sidebar main";
  grid-template-columns: 1fr 5fr;
  gap: 1.5rem;
}
.bs-sidebar { grid-area: sidebar; }
.bs-main { grid-area: main; }
.bs-content { grid-area: content; min-width: 1px; }
.bs-fixed-sidetoc { height: calc(100vh - 10rem); }
.bs-fixed-footer { height: auto; padding-top: 0.25rem; }
@media (max-width: 991.98px) {
  .bs-main { margin-inline: auto; }
  .bs-fixed-sidetoc { height: calc(100vh); }
}
@media (min-width: 768px) {
  .bs-main {
    display: grid;
    grid-template-areas: "content";
    grid-template-rows: auto auto 1fr;
    gap: inherit;
  }
}
@media (min-width: 992px) {
  .bs-main {
    grid-template-areas: "content";
    grid-template-rows: auto 1fr;
  }
  .codeblock {
    min-width: 100%;
    max-width: calc(80vw - 2rem);
  }
  .bs-sidebar {
    position: sticky;
    top: 0.5rem;
    display: block !important;
    height: calc(100vh - 1rem);
    padding-left: 0.25rem;
    margin-left: -0.25rem;
  }
}
@media (max-width: 991.98px) {
  .bd-navbar .bd-navbar-toggle { width: 4.25rem; }
  .bs-container { grid-template-columns: 0fr 1fr; }
  .codeblock, .table, .tablist, .note, .carousel, .section, .shortdesc, .topic {
    max-width: calc(100vw - 4rem);
  }
  .bs-sidebar .offcanvas-lg { border-right-color: var(--bs-border-color); }
}
.nested0 { margin-top: 0; }
.nested1 { margin-top: 1em; }
.nested0, article h1 { scroll-margin-top: 7.25rem; }
.nested1, article h2, article h3, article h4, article [tabindex="0"] { scroll-margin-top: 5.25rem; }

/* --- scrollspy-toc.css --- */
.bd-toc {
  position: sticky;
  top: 0.5rem;
  font-size: 0.875rem;
}
.bd-toc nav ul {
  padding-left: 0;
  list-style: none;
}
.bd-toc nav li {
  margin-bottom: 0.25rem;
}
.bd-toc a {
  color: var(--bs-body-color);
  text-decoration: none;
}
.bd-toc a:hover {
  color: var(--bs-link-hover-color);
}
.bd-toc .active {
  font-weight: 600;
  color: var(--bs-primary);
}
`;
