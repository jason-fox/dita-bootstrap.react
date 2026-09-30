"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// Offcanvas/Collapse need real React state (unlike Tab/Accordion/Carousel's internal state)
// since their toggle button and target are AST siblings, not nested - coordinate via id here.
interface ToggleContextValue {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  close: (id: string) => void;
}

const ToggleContext = createContext<ToggleContextValue | null>(null);

export function useToggleContext(): ToggleContextValue {
  const ctx = useContext(ToggleContext);
  if (!ctx) throw new Error("Offcanvas/Collapse/ToggleButton AST nodes must render within AstRenderer");
  return ctx;
}

export function ToggleProvider({ children }: { children: React.ReactNode }) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const normalizeId = (id: string) => id.replace(/^(offcanvas|collapse)__/, "");
  const toggle = useCallback((id: string) => {
    const cleanId = normalizeId(id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(cleanId)) next.delete(cleanId);
      else next.add(cleanId);
      return next;
    });
  }, []);
  const close = useCallback((id: string) => {
    const cleanId = normalizeId(id);
    setOpenIds((prev) => (prev.has(cleanId) ? new Set([...prev].filter((existing) => existing !== cleanId)) : prev));
  }, []);
  const isOpen = useCallback((id: string) => openIds.has(normalizeId(id)), [openIds]);
  const value = useMemo(() => ({ isOpen, toggle, close }), [isOpen, toggle, close]);
  return <ToggleContext.Provider value={value}>{children}</ToggleContext.Provider>;
}
