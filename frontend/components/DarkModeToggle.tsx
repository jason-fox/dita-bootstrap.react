"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "auto";

const MODES: Mode[] = ["light", "dark", "auto"];
const ICONS: Record<Mode, string> = {
  light: "bi-brightness-high-fill",
  dark: "bi-moon-stars-fill",
  auto: "bi-circle-half",
};
const STORAGE_KEY = "theme";

function resolveTheme(mode: Mode): "light" | "dark" {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyMode(mode: Mode) {
  document.documentElement.setAttribute("data-bs-theme", resolveTheme(mode));
}

export default function DarkModeToggle() {
  // starts "auto" on both server and client render so hydration matches;
  // the real (possibly stored) mode is only applied client-side after mount
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Mode | null;
    const initial = stored && MODES.includes(stored) ? stored : "auto";
    setMode(initial);
    applyMode(initial);
  }, []);

  function cycle() {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyMode(next);
  }

  return (
    <button
      type="button"
      className="nav-link px-0 px-lg-2 d-flex align-items-center"
      aria-label={`Switch to ${MODES[(MODES.indexOf(mode) + 1) % MODES.length]} mode (currently ${mode})`}
      onClick={cycle}
    >
      <i className={`bi ${ICONS[mode]}`} />
    </button>
  );
}
