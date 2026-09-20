"use client";

import { useEffect, useState } from "react";
import NavDropdown from "react-bootstrap/NavDropdown";
import { useActiveTheme } from "../lib/theme";

type Mode = "light" | "dark" | "auto";

const MODES: Mode[] = ["light", "dark", "auto"];
const ICONS: Record<Mode, string> = {
  light: "bi-brightness-high-fill",
  dark: "bi-moon-stars-fill",
  auto: "bi-circle-half",
};
const LABELS: Record<Mode, string> = {
  light: "Light",
  dark: "Dark",
  auto: "Auto",
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
  const activeTheme = useActiveTheme();
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Mode | null;
    const initial = stored && MODES.includes(stored) ? stored : "auto";
    setMode(initial);
    applyMode(initial);
  }, []);

  function handleSelect(selected: Mode) {
    setMode(selected);
    localStorage.setItem(STORAGE_KEY, selected);
    applyMode(selected);
  }

  return (
    <NavDropdown
      id="bd-theme"
      title={<i className={`bi ${ICONS[mode]} fs-5`} />}
      align="end"
      className="nav-item"
      aria-label="Toggle theme"
      data-bs-theme={activeTheme}
    >
      {MODES.map((m) => (
        <NavDropdown.Item
          key={m}
          active={mode === m}
          onClick={() => handleSelect(m)}
          className="d-flex align-items-center gap-2"
        >
          <i className={`bi ${ICONS[m]}`} />
          <span>{LABELS[m]}</span>
          {mode === m && <i className="bi bi-check2 ms-auto" />}
        </NavDropdown.Item>
      ))}
    </NavDropdown>
  );
}
