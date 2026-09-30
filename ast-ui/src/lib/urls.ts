const isServer = typeof window === "undefined";

export const PUBLIC_DATA_URL = process.env.NEXT_PUBLIC_DATA_URL ?? "http://localhost:4000/data";
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export const DATA_URL = isServer ? process.env.INTERNAL_DATA_URL ?? PUBLIC_DATA_URL : PUBLIC_DATA_URL;

export const API_URL = isServer ? process.env.INTERNAL_API_URL ?? PUBLIC_API_URL : PUBLIC_API_URL;
