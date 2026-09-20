function isPropsObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function astToHtml(node: unknown, docsTitle?: string): string {
  if (typeof node === "string") {
    return node;
  }
  if (!Array.isArray(node) || node.length === 0) {
    return "";
  }
  const [rawType, ...rest] = node;
  const hasProps = rest.length > 0 && isPropsObject(rest[0]);
  const props: Record<string, any> = hasProps ? (rest[0] as Record<string, any>) : {};
  let children: any[] = hasProps ? rest.slice(1) : rest;

  let tag = rawType;
  const classNames: string[] = props.className ? [props.className] : [];

  switch (rawType) {
    case "Navbar":
      tag = "nav";
      if (!props.className) classNames.push("navbar navbar-expand-lg");
      break;
    case "NavbarBrand":
      tag = "a";
      if (!props.className) classNames.push("navbar-brand d-flex align-items-center fw-semibold");
      if (!props.href) props.href = "#";
      if (docsTitle && children.length > 0) {
        children = children.map((c) => {
          if (Array.isArray(c) && c[0] === "span") {
            const spanChildren = isPropsObject(c[1]) ? c.slice(2) : c.slice(1);
            if (spanChildren.length === 0 || (spanChildren.length === 1 && spanChildren[0] === "")) {
              return isPropsObject(c[1]) ? ["span", c[1], docsTitle] : ["span", docsTitle];
            }
          }
          return c;
        });
      }
      break;
    case "NavbarToggle":
      if (props["aria-controls"] === "bdSidebar") {
        return "";
      }
      tag = "button";
      if (!props.className) classNames.push("navbar-toggler p-2");
      if (!props.type) props.type = "button";
      if (!props["data-bs-toggle"]) props["data-bs-toggle"] = "collapse";
      if (children.length === 0) {
        children = [["span", { className: "navbar-toggler-icon" }]];
      }
      break;
    case "NavbarCollapse":
      tag = "div";
      if (!props.className) classNames.push("collapse navbar-collapse");
      break;
    case "Nav":
      tag = "div";
      if (!props.className) classNames.push("navbar-nav");
      break;
    case "NavDropdown":
      if (props.role === "theme-toggle") {
        const themeId = props.id || "bd-theme";
        const themeChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
        return `<div class="nav-item dropdown ms-lg-2" id="${themeId}">
          <button class="btn btn-link nav-link py-1 px-2 dropdown-toggle d-flex align-items-center text-body" id="theme-toggle-btn" type="button" aria-expanded="false" data-bs-toggle="dropdown" aria-label="Toggle theme">
            <i class="bi bi-circle-half fs-5 me-1" id="theme-toggle-icon"></i>
            <span class="d-lg-none ms-2">Toggle theme</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="theme-toggle-btn">
            ${themeChildrenHtml}
          </ul>
        </div>`;
      }
      tag = "div";
      if (!props.className) classNames.push("nav-item dropdown");
      const dropdownChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
      return `<div class="nav-item dropdown ${classNames.join(" ")}">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" id="${props.id || ''}">
          Dropdown
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          ${dropdownChildrenHtml}
        </ul>
      </div>`;
    case "NavDropdownItem":
      classNames.push("dropdown-item d-flex align-items-center");
      if (!props.href) props.href = "#";
      if (props["data-bs-theme-value"]) {
        const val = props["data-bs-theme-value"];
        props.onclick = `selectTheme('${val}'); return false;`;
      }
      const itemAttrParts: string[] = [];
      if (classNames.length > 0) itemAttrParts.push(`class="${classNames.join(" ")}"`);
      for (const [k, v] of Object.entries(props)) {
        if (["className", "variant", "size", "name", "as"].includes(k)) continue;
        if (typeof v === "string" || typeof v === "number") itemAttrParts.push(`${k}="${v}"`);
      }
      const itemChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
      return `<li><a ${itemAttrParts.join(" ")}>${itemChildrenHtml}</a></li>`;
    case "Favicon":
      return '<img src="/favicon.svg" alt="" class="me-2" style="width:1.75rem;height:1.75rem;object-fit:contain;">';
    case "InputGroup":
      tag = "div";
      if (!props.className) classNames.push("input-group");
      break;
    case "InputGroupText":
      tag = "span";
      if (!props.className) classNames.push("input-group-text");
      break;
    case "Card":
      tag = "div";
      if (!props.className) classNames.push("card");
      break;
    case "CardBody":
      tag = "div";
      if (!props.className) classNames.push("card-body");
      break;
    case "CardTitle":
      tag = props.as || "h5";
      if (!props.className) classNames.push("card-title");
      break;
    case "CardText":
      tag = props.as || "p";
      if (!props.className) classNames.push("card-text");
      break;
    case "Form":
      tag = "form";
      if (props.role === "search" || (props.className && props.className.includes("search-box"))) {
        props.onsubmit = "event.preventDefault();";
      } else if (!props.onSubmit && props.id === "chat-form") {
        props.onsubmit = "handleFormSubmit(event)";
      }
      break;
    case "FormControl":
      tag = "input";
      if (!props.className) classNames.push("form-control");
      break;
    case "Button":
      tag = "button";
      const variant = props.variant || "primary";
      const btnClass = `btn btn-${variant}`;
      if (!classNames.some((c) => c.includes("btn-"))) {
        classNames.unshift(btnClass);
      } else if (!classNames.some((c) => c.split(" ").includes("btn"))) {
        classNames.unshift("btn");
      }
      if (!props.onclick && props.size === "sm") {
        props.onclick = "sendQuickPrompt('What documentation sets are available?')";
      }
      break;
    case "Icon":
      tag = "i";
      if (props.name) {
        classNames.push(`bi bi-${props.name}`);
      }
      break;
    case "Container":
      tag = "div";
      if (!props.className) classNames.push("container");
      break;
    case "Row":
      tag = "div";
      if (!props.className) classNames.push("row");
      break;
    case "Col":
      tag = "div";
      if (!props.className) classNames.push("col");
      break;
    default:
      tag = rawType;
      break;
  }

  const attrParts: string[] = [];
  if (classNames.length > 0) {
    attrParts.push(`class="${classNames.join(" ")}"`);
  }

  for (const [key, val] of Object.entries(props)) {
    if (["className", "variant", "size", "name", "as", "expand", "sticky"].includes(key)) continue;
    if (key === "autoComplete") {
      attrParts.push(`autocomplete="${val}"`);
    } else if (key === "style" && typeof val === "string") {
      attrParts.push(`style="${val}"`);
    } else if (typeof val === "boolean") {
      if (val) attrParts.push(key);
    } else if (typeof val === "string" || typeof val === "number") {
      attrParts.push(`${key}="${val}"`);
    }
  }

  const attrStr = attrParts.length > 0 ? ` ${attrParts.join(" ")}` : "";
  const childrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");

  if (["input", "img", "hr", "br"].includes(tag)) {
    return `<${tag}${attrStr}>`;
  }

  return `<${tag}${attrStr}>${childrenHtml}</${tag}>`;
}
