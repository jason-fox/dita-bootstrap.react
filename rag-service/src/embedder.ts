import { resolveModel, type ModelSpec } from "./models";

type Extractor = (
  texts: string[],
  opts: { pooling: "cls" | "mean"; normalize: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

const BATCH_SIZE = 16;

export class Embedder {
  public readonly spec: ModelSpec;
  private extractor?: Extractor;

  constructor(
    public readonly modelName: string,
    private dtype: string = "q8",
    private cacheDir?: string,
  ) {
    this.spec = resolveModel(modelName);
  }

  public get id(): string {
    return `${this.modelName}:${this.dtype}`;
  }

  public async load(): Promise<void> {
    if (this.extractor) return;
    const { pipeline, env } = await import("@huggingface/transformers");
    if (this.cacheDir) env.cacheDir = this.cacheDir;
    if (process.env.HF_OFFLINE === "true") env.allowRemoteModels = false;
    this.extractor = (await pipeline("feature-extraction", this.spec.repo, {
      dtype: this.dtype as "q8",
    })) as unknown as Extractor;
  }

  private async embed(texts: string[]): Promise<Float32Array[]> {
    await this.load();
    const out: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const { data, dims } = await this.extractor!(batch, {
        pooling: this.spec.pooling,
        normalize: true,
      });
      const dim = dims[dims.length - 1];
      for (let j = 0; j < batch.length; j++) {
        out.push(Float32Array.from(data.subarray(j * dim, (j + 1) * dim)));
      }
    }
    return out;
  }

  public embedPassages(texts: string[]): Promise<Float32Array[]> {
    return this.embed(texts.map((t) => this.spec.passagePrefix + t));
  }

  public async embedQuery(text: string): Promise<Float32Array> {
    const [vec] = await this.embed([this.spec.queryPrefix + text]);
    return vec;
  }
}
