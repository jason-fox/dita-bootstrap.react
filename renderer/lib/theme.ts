"use client";

import { useEffect, useState } from "react";

export function useActiveTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-bs-theme");
      if (current === "dark" || current === "light") {
        setTheme(current);
      }
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-bs-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
