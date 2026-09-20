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
      if (!classNames.includes("navbar")) classNames.unshift("navbar");
      if (!classNames.some((c) => c.includes("navbar-expand"))) classNames.push("navbar-expand-lg");
      break;
    case "NavbarBrand":
      tag = "a";
      if (!classNames.includes("navbar-brand")) classNames.unshift("navbar-brand");
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
    case "NavLink":
      tag = "a";
      if (!classNames.includes("nav-link")) classNames.unshift("nav-link");
      if (!props.href) props.href = "#";
      break;
    case "NavbarToggle":
      if (props["aria-controls"] === "bdSidebar") {
        return "";
      }
      tag = "button";
      if (!classNames.includes("navbar-toggler")) classNames.unshift("navbar-toggler");
      if (!props.type) props.type = "button";
      if (!props["data-bs-toggle"]) props["data-bs-toggle"] = "collapse";
      if (children.length === 0) {
        children = [["span", { className: "navbar-toggler-icon" }]];
      }
      break;
    case "NavbarCollapse":
      tag = "div";
      if (!classNames.includes("navbar-collapse")) classNames.unshift("navbar-collapse");
      if (!classNames.includes("collapse")) classNames.unshift("collapse");
      break;
    case "Nav":
      tag = "div";
      if (!classNames.includes("navbar-nav")) classNames.unshift("navbar-nav");
      break;
    case "NavDropdown":
      if (props.role === "theme-toggle") {
        const themeId = props.id || "bd-theme";
        const themeChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
        return `<div class="nav-item dropdown ms-lg-2" id="${themeId}">
          <a class="nav-link dropdown-toggle d-flex align-items-center" id="theme-toggle-btn" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Toggle theme">
            <i class="bi bi-circle-half fs-5" id="theme-toggle-icon"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="theme-toggle-btn">
            ${themeChildrenHtml}
          </ul>
        </div>`;
      }
      tag = "div";
      if (!classNames.includes("nav-item")) classNames.unshift("nav-item");
      if (!classNames.includes("dropdown")) classNames.push("dropdown");
      const dropdownChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
      return `<div class="nav-item dropdown ${classNames.join(" ")}">
        <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" id="${props.id || ''}">
          Dropdown
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          ${dropdownChildrenHtml}
        </ul>
      </div>`;
    case "NavDropdownItem":
      if (!classNames.includes("dropdown-item")) classNames.unshift("dropdown-item");
      if (!classNames.includes("d-flex")) classNames.push("d-flex", "align-items-center", "gap-2");
      if (!props.href) props.href = "#";
      const val = props["data-bs-theme-value"];
      if (val) {
        props.onclick = `selectTheme('${val}'); return false;`;
      }
      const itemAttrParts: string[] = [];
      if (classNames.length > 0) itemAttrParts.push(`class="${classNames.join(" ")}"`);
      for (const [k, v] of Object.entries(props)) {
        if (["className", "variant", "size", "name", "as"].includes(k)) continue;
        if (typeof v === "string" || typeof v === "number") itemAttrParts.push(`${k}="${v}"`);
      }
      const itemChildrenHtml = children.map((c) => astToHtml(c, docsTitle)).join("");
      const checkIcon = val ? `<i class="bi bi-check2 ms-auto d-none" data-theme-check="${val}"></i>` : "";
      return `<li><a ${itemAttrParts.join(" ")}>${itemChildrenHtml}${checkIcon}</a></li>`;
    case "Favicon":
      return '<img src="/favicon.svg" alt="" class="me-2" style="width:1.75rem;height:1.75rem;object-fit:contain;">';
    case "InputGroup":
      tag = "div";
      if (!classNames.includes("input-group")) classNames.unshift("input-group");
      break;
    case "InputGroupText":
      tag = "span";
      if (!classNames.includes("input-group-text")) classNames.unshift("input-group-text");
      break;
    case "Card":
      tag = "div";
      if (!classNames.includes("card")) classNames.unshift("card");
      break;
    case "CardBody":
      tag = "div";
      if (!classNames.includes("card-body")) classNames.unshift("card-body");
      break;
    case "CardTitle":
      tag = props.as || "h5";
      if (!classNames.includes("card-title")) classNames.unshift("card-title");
      break;
    case "CardText":
      tag = props.as || "p";
      if (!classNames.includes("card-text")) classNames.unshift("card-text");
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
      if (!classNames.includes("form-control")) classNames.unshift("form-control");
      break;
    case "Button":
      tag = "button";
      if (props.role === "clear-chat") {
        if (!props.onclick) props.onclick = "clearChat()";
      } else if (props.role === "theme-toggle") {
        if (!props.id) props.id = "theme-toggle-btn";
        if (!props.onclick) props.onclick = "cycleTheme()";
        children = children.map((c) => {
          if (Array.isArray(c) && c[0] === "Icon") {
            const iconProps = isPropsObject(c[1]) ? { ...c[1], id: "theme-toggle-icon" } : { id: "theme-toggle-icon" };
            return isPropsObject(c[1]) ? ["Icon", iconProps, ...c.slice(2)] : ["Icon", iconProps, ...c.slice(1)];
          }
          return c;
        });
      }
      const allClassNames = classNames.flatMap((c) => c.split(" "));
      const hasBtnVariant = allClassNames.some((c) => /^btn-(primary|secondary|success|danger|warning|info|light|dark|link|outline-)/.test(c));
      const hasNavLink = allClassNames.includes("nav-link");

      if (!hasNavLink) {
        if (!allClassNames.includes("btn")) {
          classNames.unshift("btn");
        }
        if (!hasBtnVariant) {
          const variant = props.variant || "primary";
          classNames.push(`btn-${variant}`);
        }
      }

      if (!props.onclick && props.size === "sm" && props.role !== "clear-chat") {
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
      if (props.fluid) {
        const fluidClass = props.fluid === true ? "container-fluid" : `container-${props.fluid}`;
        if (!classNames.includes(fluidClass)) classNames.unshift(fluidClass);
      } else if (!classNames.some((c) => c.startsWith("container"))) {
        classNames.unshift("container");
      }
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
