import Prism from "prismjs";
import components from "prismjs/components.json";

type PrismComponent = { require?: string | string[]; alias?: string | string[] };
const languages = components.languages as unknown as Record<string, PrismComponent>;

const aliases = new Map<string, string>();
for (const [name, def] of Object.entries(languages)) {
  if (name === "meta") continue;
  for (const alias of [def.alias ?? []].flat()) aliases.set(alias, name);
}

const loading = new Map<string, Promise<void>>();

function loadLanguage(requested: string): Promise<void> {
  const lang = aliases.get(requested) ?? requested;
  if (!languages[lang] || lang === "meta" || Prism.languages[lang]) return Promise.resolve();

  let pending = loading.get(lang);
  if (!pending) {
    pending = (async () => {
      for (const dependency of [languages[lang].require ?? []].flat()) await loadLanguage(dependency);
      await import(`prismjs/components/prism-${lang}`);
    })();
    loading.set(lang, pending);
  }
  return pending;
}

// unknown or failing languages are skipped; their blocks stay unhighlighted
export async function loadPrismLanguages(requested: string[]): Promise<void> {
  await Promise.allSettled(requested.map((lang) => loadLanguage(lang.toLowerCase())));
}
