import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Node 25's built-in localStorage global shadows jsdom's and has no methods
// without --localstorage-file, so use a plain in-memory store.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
});

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

afterEach(() => {
  cleanup();
  store.clear();
  document.documentElement.removeAttribute("data-bs-theme");
});
