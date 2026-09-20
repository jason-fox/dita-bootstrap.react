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
      tag = "button";
      if (!props.className) classNames.push("navbar-toggler p-2");
      if (!props.type) props.type = "button";
      if (!props["data-bs-toggle"]) props["data-bs-toggle"] = "collapse";
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
      tag = "div";
      if (!props.className) classNames.push("nav-item dropdown");
      break;
    case "NavDropdownItem":
      tag = "a";
      if (!props.className) classNames.push("dropdown-item");
      if (!props.href) props.href = "#";
      break;
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
      if (!props.onSubmit && props.id === "chat-form") {
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
