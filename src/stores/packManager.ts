import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import JSZip from 'jszip';
import type { PackData } from 'src/jei/types';
import { idbDeletePackZip, idbGetPackZip, idbSetPackZip } from 'src/jei/utils/idb';
import { useEditorStore } from 'src/stores/editor';

export interface LocalPackEntry {
  id: string;
  name: string;
  packId: string;
  updatedAt: number;
}

interface StoredPackIndex {
  version: 1;
  currentId?: string;
  entries: LocalPackEntry[];
}

function now() {
  return Date.now();
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeParseIndex(raw: string | null): StoredPackIndex {
  if (!raw) return { version: 1, entries: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPackIndex>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return { version: 1, entries: [] };
    const currentId = typeof parsed.currentId === 'string' ? parsed.currentId : undefined;
    return currentId
      ? { version: 1, currentId, entries: parsed.entries }
      : { version: 1, entries: parsed.entries };
  } catch {
    return { version: 1, entries: [] };
  }
}

async function zipToPackData(zipBlob: Blob): Promise<{ pack: PackData; assets: { path: string; blob: Blob }[] }> {
  const zip = await JSZip.loadAsync(zipBlob);
  const manifestFile = zip.file(/manifest\.json$/i)[0];
  if (!manifestFile) throw new Error('manifest.json not found in zip');
  const manifest = JSON.parse(await manifestFile.async('string')) as PackData['manifest'];
  const baseDir = manifestFile.name.replace(/manifest\.json$/i, '');
  const readJson = async (rel: string | undefined) => {
    if (!rel) return undefined;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) throw new Error(`Missing ${rel}`);
    return JSON.parse(await file.async('string')) as unknown;
  };

  const items = (await readJson(manifest.files.items)) as PackData['items'];
  const tags = (await readJson(manifest.files.tags)) as PackData['tags'];
  const recipeTypes = (await readJson(manifest.files.recipeTypes)) as PackData['recipeTypes'];
  const recipes = (await readJson(manifest.files.recipes)) as PackData['recipes'];

  const pack: PackData = {
    manifest,
    items: items || [],
    recipeTypes: recipeTypes || [],
    recipes: recipes || [],
  };
  if (tags) pack.tags = tags;

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
    assets.push({
      path: rel,
      blob: new Blob([]),
    });
  });

  for (let i = 0; i < assets.length; i += 1) {
    const rel = assets[i]!.path;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) continue;
    const blob = await file.async('blob');
    assets[i] = { path: rel, blob };
  }

  return { pack, assets };
}

export const usePackManagerStore = defineStore('packManager', () => {
  const INDEX_KEY = 'jei.editor.localPacks.v1';
  const editorStore = useEditorStore();

  const entries = ref<LocalPackEntry[]>(safeParseIndex(localStorage.getItem(INDEX_KEY)).entries);
  const currentId = ref<string | null>(safeParseIndex(localStorage.getItem(INDEX_KEY)).currentId ?? null);

  function persist() {
    const out: StoredPackIndex = currentId.value
      ? { version: 1, currentId: currentId.value, entries: entries.value }
      : { version: 1, entries: entries.value };
    localStorage.setItem(INDEX_KEY, JSON.stringify(out));
  }

  const currentEntry = computed(() => entries.value.find((e) => e.id === currentId.value) || null);

  async function loadLocalPack(id: string) {
    const zipBlob = await idbGetPackZip(id);
    if (!zipBlob) throw new Error('Pack zip not found');
    const { pack, assets } = await zipToPackData(zipBlob);
    editorStore.loadPack(pack);
    editorStore.resetAssets();
    await editorStore.addAssetBlobs(
      assets.map((a) => ({
        path: a.path,
        blob: a.blob,
      })),
    );
    editorStore.setBaselineFromCurrent();
    currentId.value = id;
    persist();
  }

  async function saveToExisting() {
    if (!currentId.value) throw new Error('No current pack selected');
    const id = currentId.value;
    const entry = entries.value.find((e) => e.id === id);
    if (!entry) throw new Error('Pack entry not found');
    const snapshot = editorStore.getSaveSnapshot();
    const blob = await editorStore.buildZipForExport({ includeReferenced: true });
    await idbSetPackZip(id, blob);
    entry.packId = snapshot.pack.manifest.packId;
    entry.name = snapshot.pack.manifest.displayName || snapshot.pack.manifest.packId;
    entry.updatedAt = now();
    persist();
    editorStore.commitAcceptedToBaseline();
  }

  async function saveAs(name?: string) {
    const id = makeId();
    const snapshot = editorStore.getSaveSnapshot();
    const blob = await editorStore.buildZipForExport({ includeReferenced: true });
    await idbSetPackZip(id, blob);
    const entry: LocalPackEntry = {
      id,
      name: name || snapshot.pack.manifest.displayName || snapshot.pack.manifest.packId,
      packId: snapshot.pack.manifest.packId,
      updatedAt: now(),
    };
    entries.value.unshift(entry);
    currentId.value = id;
    persist();
    editorStore.commitAcceptedToBaseline();
  }

  async function deleteLocalPack(id: string) {
    await idbDeletePackZip(id);
    entries.value = entries.value.filter((e) => e.id !== id);
    if (currentId.value === id) currentId.value = null;
    persist();
  }

  function selectCurrent(id: string | null) {
    currentId.value = id;
    persist();
  }

  return {
    entries,
    currentId,
    currentEntry,
    loadLocalPack,
    saveToExisting,
    saveAs,
    deleteLocalPack,
    selectCurrent,
  };
});
