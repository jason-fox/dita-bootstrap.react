"use client";

import { useEffect, useState } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useActiveTheme } from "../../../hooks/useActiveTheme";
import { PUBLIC_DATA_URL } from "../../../lib/urls";

// used when scalar.json is missing from the data store
const FALLBACK_CONFIG = { hideClientButton: true, withDefaultFonts: false };

const CSS = `
.ast-api-reference .section { padding: 2rem 0 !important; }
.ast-api-reference .section-container { padding: 0 !important; }
.ast-api-reference pre.text-nowrap { white-space: pre !important; }
.ast-api-reference .api-reference-toolbar [class*="-mx-2"] > :nth-child(n + 4) { display: none; }
.ast-api-reference .scalar-app,
.ast-api-reference .light-mode,
.ast-api-reference .dark-mode {
  --scalar-background-1: var(--bs-body-bg);
  --scalar-background-2: var(--bs-tertiary-bg);
  --scalar-background-3: var(--bs-secondary-bg);
  --scalar-color-1: var(--bs-body-color);
  --scalar-color-2: var(--bs-secondary-color);
  --scalar-color-3: var(--bs-tertiary-color);
  --scalar-border-color: var(--bs-border-color);
  --scalar-color-accent: var(--bs-primary);
  --scalar-link-color: var(--bs-link-color);
  --scalar-color-green: var(--bs-green);
  --scalar-color-red: var(--bs-red);
  --scalar-color-yellow: var(--bs-yellow);
  --scalar-color-blue: var(--bs-blue);
  --scalar-color-orange: var(--bs-orange);
  --scalar-color-purple: var(--bs-purple);
  --scalar-radius: var(--bs-border-radius);
  --scalar-radius-lg: var(--bs-border-radius-lg);
  --scalar-radius-xl: var(--bs-border-radius-xl);
  --scalar-button-1: var(--bs-primary);
  --scalar-button-1-color: var(--bs-white);
  --scalar-button-1-hover: var(--bs-primary-text-emphasis);
  --scalar-focus-color: var(--bs-focus-ring-color);
  --scalar-link-color-hover: var(--bs-link-hover-color);
  --scalar-color-alert: var(--bs-warning-text-emphasis);
  --scalar-color-danger: var(--bs-danger-text-emphasis);
  --scalar-background-alert: var(--bs-warning-bg-subtle);
  --scalar-background-danger: var(--bs-danger-bg-subtle);
  --scalar-shadow-1: var(--bs-box-shadow-sm);
  --scalar-shadow-2: var(--bs-box-shadow);
  --scalar-font: var(--bs-body-font-family);
  --scalar-font-code: var(--bs-font-monospace);
}
`;

export interface ApiReferenceFromAstProps {
  specUrl: string;
  docId?: string;
  topicPath?: string;
}

// specUrl is relative to the topic JSON's own directory in the data store
export function resolveSpecUrl(specUrl: string, docId?: string, topicPath?: string): string {
  if (/^(https?:)?\/\//.test(specUrl) || specUrl.startsWith("/")) {
    return specUrl;
  }
  const topicDir = topicPath?.split("/").slice(0, -1).join("/");
  const base = docId && docId !== "default" ? `${PUBLIC_DATA_URL}/${docId}` : PUBLIC_DATA_URL;
  return [base, topicDir, specUrl.replace(/^(\.\/)+/, "")].filter(Boolean).join("/");
}

export default function ApiReferenceFromAst({ specUrl, docId, topicPath }: ApiReferenceFromAstProps) {
  const theme = useActiveTheme();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`${PUBLIC_DATA_URL}/scalar.json`)
      .then((res) => (res.ok ? res.json() : FALLBACK_CONFIG))
      .catch(() => FALLBACK_CONFIG)
      .then(setConfig);
  }, []);

  if (!config) return null;
  return (
    <div className="ast-api-reference">
      <style>{CSS}</style>
      <ApiReferenceReact
        key={theme}
        configuration={{ ...config, forceDarkModeState: theme, url: resolveSpecUrl(specUrl, docId, topicPath) }}
      />
    </div>
  );
}
