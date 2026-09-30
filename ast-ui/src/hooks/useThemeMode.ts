"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "theme";
const MODES: ThemeMode[] = ["light", "dark", "auto"];

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyMode(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-bs-theme", resolveTheme(mode));
  }
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  return stored && MODES.includes(stored) ? stored : "auto";
}

export function useThemeMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, () => "auto" as ThemeMode);

  useEffect(() => applyMode(mode), [mode]);

  const select = (selected: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, selected);
    listeners.forEach((listener) => listener());
  };

  const cycle = () => select(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);

  return { mode, select, cycle };
}
