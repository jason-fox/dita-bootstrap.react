export interface ModelSpec {
  repo: string;
  pooling: "cls" | "mean";
  queryPrefix: string;
  passagePrefix: string;
  multilingual: boolean;
}

export const DEFAULT_MODEL = "bge-m3";

export const MODELS: Record<string, ModelSpec> = {
  "bge-m3": {
    repo: "Xenova/bge-m3",
    pooling: "cls",
    queryPrefix: "",
    passagePrefix: "",
    multilingual: true,
  },
  "multilingual-e5-base": {
    repo: "Xenova/multilingual-e5-base",
    pooling: "mean",
    queryPrefix: "query: ",
    passagePrefix: "passage: ",
    multilingual: true,
  },
  "multilingual-e5-small": {
    repo: "Xenova/multilingual-e5-small",
    pooling: "mean",
    queryPrefix: "query: ",
    passagePrefix: "passage: ",
    multilingual: true,
  },
  "bge-base-en-v1.5": {
    repo: "Xenova/bge-base-en-v1.5",
    pooling: "cls",
    queryPrefix: "Represent this sentence for searching relevant passages: ",
    passagePrefix: "",
    multilingual: false,
  },
  "bge-small-en-v1.5": {
    repo: "Xenova/bge-small-en-v1.5",
    pooling: "cls",
    queryPrefix: "Represent this sentence for searching relevant passages: ",
    passagePrefix: "",
    multilingual: false,
  },
};

export function resolveModel(name: string): ModelSpec {
  const spec = MODELS[name];
  if (!spec) {
    throw new Error(`Unknown EMBED_MODEL '${name}'. Available: ${Object.keys(MODELS).join(", ")}`);
  }
  return spec;
}
