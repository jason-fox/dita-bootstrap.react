import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useThemeMode } from "../../../src/hooks/useThemeMode";

describe("useThemeMode", () => {
  it("defaults to auto and applies the resolved theme", () => {
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.mode).toBe("auto");
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("light");
  });

  it("persists the selected mode and updates data-bs-theme", () => {
    const { result } = renderHook(() => useThemeMode());
    act(() => result.current.select("dark"));
    expect(result.current.mode).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe("dark");
  });

  it("cycles light, dark, auto", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useThemeMode());
    act(() => result.current.cycle());
    expect(result.current.mode).toBe("dark");
    act(() => result.current.cycle());
    expect(result.current.mode).toBe("auto");
  });
});
