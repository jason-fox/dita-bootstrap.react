import type React from "react";

export function FaviconFromAst({
  className = "me-2",
  style,
  ...props
}: {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}) {
  const defaultStyle: React.CSSProperties = {
    width: "1.75rem",
    height: "1.75rem",
    objectFit: "contain",
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG; props/onError come from the AST
    <img
      src="/favicon.svg"
      alt=""
      className={className}
      style={style ?? defaultStyle}
      onError={(e) => (e.currentTarget.style.display = "none")}
      {...props}
    />
  );
}

export function IconFromAst({
  name,
  className = "",
  ...props
}: {
  name?: string;
  className?: string;
  [key: string]: unknown;
}) {
  const iconName = name ?? "";
  const iconClass = iconName.startsWith("bi-") ? iconName : `bi-${iconName}`;
  return <i className={`bi ${iconClass} ${className}`.trim()} {...props} />;
}
