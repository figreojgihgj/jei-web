import type { ItemDef, PackData, PackManifest, PackTags, Recipe, RecipeTypeDef } from 'src/jei/types';
import { stableJsonStringify } from 'src/jei/utils/stableJson';
import { idbGetPackZip } from 'src/jei/utils/idb';
import { assertItemDef, assertPackManifest, assertPackTags, assertRecipe, assertRecipeTypeDef } from './validate';
import JSZip from 'jszip';

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ${url} (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

function packBaseUrl(packId: string): string {
  const safe = encodeURIComponent(packId);
  return `/packs/${safe}`;
}

function itemKeyHash(def: { key: { id: string; meta?: number | string; nbt?: unknown } }): string {
  return `${def.key.id}::${def.key.meta ?? ''}::${stableJsonStringify(def.key.nbt ?? null)}`;
}

function mergeInlineItems(items: ItemDef[], recipes: Recipe[]): ItemDef[] {
  const byHash = new Map<string, ItemDef>();
  items.forEach((it) => byHash.set(itemKeyHash(it), it));
  recipes.forEach((r) => {
    r.inlineItems?.forEach((it) => {
      const key = itemKeyHash(it);
      if (!byHash.has(key)) byHash.set(key, it);
    });
  });
  return Array.from(byHash.values());
}

async function loadManifest(packId: string): Promise<PackManifest> {
  const base = packBaseUrl(packId);
  const raw = await fetchJson(`${base}/manifest.json`);
  const manifest = assertPackManifest(raw, '$.manifest');
  if (manifest.packId !== packId) {
    throw new Error(`packId mismatch: requested "${packId}", manifest has "${manifest.packId}"`);
  }
  return manifest;
}

async function loadItems(base: string, manifest: PackManifest): Promise<ItemDef[]> {
  if (!manifest.files.items) return [];
  const raw = await fetchJson(`${base}/${manifest.files.items}`);
  if (!Array.isArray(raw)) {
    throw new Error('$.items: expected array');
  }
  return raw.map((v, i) => assertItemDef(v, `$.items[${i}]`));
}

async function loadRecipeTypes(base: string, manifest: PackManifest): Promise<RecipeTypeDef[]> {
  const raw = await fetchJson(`${base}/${manifest.files.recipeTypes}`);
  if (!Array.isArray(raw)) {
    throw new Error('$.recipeTypes: expected array');
  }
  return raw.map((v, i) => assertRecipeTypeDef(v, `$.recipeTypes[${i}]`));
}

async function loadRecipes(base: string, manifest: PackManifest): Promise<Recipe[]> {
  const raw = await fetchJson(`${base}/${manifest.files.recipes}`);
  if (!Array.isArray(raw)) {
    throw new Error('$.recipes: expected array');
  }
  return raw.map((v, i) => assertRecipe(v, `$.recipes[${i}]`));
}

async function loadTags(base: string, manifest: PackManifest): Promise<PackTags | undefined> {
  if (!manifest.files.tags) return undefined;
  const raw = await fetchJson(`${base}/${manifest.files.tags}`);
  return assertPackTags(raw, '$.tags');
}

type RuntimePackLoadResult = { pack: PackData; dispose: () => void };

function localSelectorToId(sel: string): string | null {
  if (!sel.startsWith('local:')) return null;
  const id = sel.slice('local:'.length).trim();
  return id ? id : null;
}

async function zipToPackData(zipBlob: Blob): Promise<{ pack: PackData; assets: { path: string; blob: Blob }[] }> {
  const zip = await JSZip.loadAsync(zipBlob);
  const manifestFile = zip.file(/manifest\.json$/i)[0];
  if (!manifestFile) throw new Error('manifest.json not found in zip');
  const manifest = assertPackManifest(JSON.parse(await manifestFile.async('string')), '$.manifest');

  const baseDir = manifestFile.name.replace(/manifest\.json$/i, '');
  const readJsonArray = async <T>(rel: string | undefined, name: string, map: (v: unknown, i: number) => T) => {
    if (!rel) return [] as T[];
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) throw new Error(`Missing ${rel}`);
    const raw = JSON.parse(await file.async('string')) as unknown;
    if (!Array.isArray(raw)) throw new Error(`$.${name}: expected array`);
    return raw.map((v, i) => map(v, i));
  };
  const readTags = async (rel: string | undefined) => {
    if (!rel) return undefined;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) throw new Error(`Missing ${rel}`);
    return assertPackTags(JSON.parse(await file.async('string')), '$.tags');
  };

  const [items, tags, recipeTypes, recipes] = await Promise.all([
    readJsonArray(manifest.files.items, 'items', (v, i) => assertItemDef(v, `$.items[${i}]`)),
    readTags(manifest.files.tags),
    readJsonArray(manifest.files.recipeTypes, 'recipeTypes', (v, i) =>
      assertRecipeTypeDef(v, `$.recipeTypes[${i}]`),
    ),
    readJsonArray(manifest.files.recipes, 'recipes', (v, i) => assertRecipe(v, `$.recipes[${i}]`)),
  ]);

  const pack: PackData = {
    manifest,
    items: mergeInlineItems(items, recipes),
    recipeTypes,
    recipes,
  };
  if (tags !== undefined) pack.tags = tags;

  const assets: { path: string; blob: Blob }[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.startsWith(baseDir)) return;
    const rel = relativePath.slice(baseDir.length);
    if (!rel) return;
    if (rel === 'manifest.json') return;
    if (rel === manifest.files.items) return;
    if (rel === manifest.files.tags) return;
    if (rel === manifest.files.recipeTypes) return;
    if (rel === manifest.files.recipes) return;
    assets.push({ path: rel, blob: new Blob([]) });
  });

  for (let i = 0; i < assets.length; i += 1) {
    const rel = assets[i]!.path;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) continue;
    assets[i] = { path: rel, blob: await file.async('blob') };
  }

  return { pack, assets };
}

function resolveLocalPackAssetUrls(pack: PackData, assets: { path: string; blob: Blob }[]): RuntimePackLoadResult {
  const base = `/packs/${encodeURIComponent(pack.manifest.packId)}/`;
  const urlByAbsolute = new Map<string, string>();
  const created: string[] = [];

  assets.forEach((a) => {
    const abs = `${base}${a.path}`;
    const url = URL.createObjectURL(a.blob);
    created.push(url);
    urlByAbsolute.set(abs, url);
  });

  const rewriteUrl = (u: string): string => {
    if (!u.startsWith(base)) return u;
    return urlByAbsolute.get(u) ?? u;
  };

  const rewriteItem = (it: ItemDef) => {
    if (it.icon) it.icon = rewriteUrl(it.icon);
    if (it.iconSprite?.url) it.iconSprite.url = rewriteUrl(it.iconSprite.url);
  };
  const rewriteMachine = (m: { icon?: string }) => {
    if (m.icon) m.icon = rewriteUrl(m.icon);
  };

  pack.items.forEach(rewriteItem);
  pack.recipes.forEach((r) => r.inlineItems?.forEach(rewriteItem));
  pack.recipeTypes.forEach((rt) => {
    const m = rt.machine;
    if (Array.isArray(m)) m.forEach(rewriteMachine);
    else if (m) rewriteMachine(m);
  });

  return {
    pack,
    dispose: () => {
      created.forEach((u) => URL.revokeObjectURL(u));
    },
  };
}

export async function loadRuntimePack(packIdOrLocal: string): Promise<RuntimePackLoadResult> {
  const localId = localSelectorToId(packIdOrLocal);
  if (localId) {
    const zipBlob = await idbGetPackZip(localId);
    if (!zipBlob) throw new Error('Local pack zip not found');
    const { pack, assets } = await zipToPackData(zipBlob);
    return resolveLocalPackAssetUrls(pack, assets);
  }

  const pack = await loadPack(packIdOrLocal);
  return { pack, dispose: () => { } };
}

export async function loadPack(packId: string): Promise<PackData> {
  const base = packBaseUrl(packId);
  const manifest = await loadManifest(packId);

  const [items, tags, recipeTypes, recipes] = await Promise.all([
    loadItems(base, manifest),
    loadTags(base, manifest),
    loadRecipeTypes(base, manifest),
    loadRecipes(base, manifest),
  ]);

  const out: PackData = {
    manifest,
    items: mergeInlineItems(items, recipes),
    recipeTypes,
    recipes,
  };
  if (tags !== undefined) out.tags = tags;
  return out;
}
