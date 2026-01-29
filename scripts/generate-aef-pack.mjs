import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const source = path.resolve(repoRoot, '..', 'factoriolab-zmd', 'src', 'data', 'aef', 'data.json');
const outDir = path.resolve(repoRoot, 'public', 'packs', 'aef');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function namespacedItemId(id) {
  return `aef.vanilla.${id}`;
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function parseAmount(v) {
  if (isFiniteNumber(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const f = Number.parseFloat(v);
    if (Number.isFinite(f)) return f;
    return v;
  }
  return 1;
}

function buildSlots(maxIn, maxOut, maxCat) {
  const slots = [];

  const inCols = Math.max(1, Math.min(3, maxIn || 1));
  for (let i = 0; i < maxIn; i += 1) {
    slots.push({
      slotId: `in${i + 1}`,
      io: 'input',
      accept: ['item', 'tag'],
      x: i % inCols,
      y: Math.floor(i / inCols),
      label: 'In',
    });
  }

  const outCols = Math.max(1, Math.min(2, maxOut || 1));
  const outX0 = inCols + 1;
  for (let i = 0; i < maxOut; i += 1) {
    slots.push({
      slotId: `out${i + 1}`,
      io: 'output',
      accept: ['item'],
      x: outX0 + (i % outCols),
      y: Math.floor(i / outCols),
      label: 'Out',
    });
  }

  const catCols = 3;
  const baseY = Math.max(Math.ceil(maxIn / inCols), Math.ceil(maxOut / outCols)) + 1;
  for (let i = 0; i < maxCat; i += 1) {
    slots.push({
      slotId: `cat${i + 1}`,
      io: 'catalyst',
      accept: ['item'],
      x: i % catCols,
      y: baseY + Math.floor(i / catCols),
      label: 'Machine',
    });
  }

  return slots;
}

function main() {
  const data = readJson(source);

  const version = data?.version?.['arknights-endfield'] ?? 'unknown';
  const iconsRaw = Array.isArray(data.icons) ? data.icons : [];
  const iconById = new Map(iconsRaw.map((ic) => [ic.id, ic]));
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const items = itemsRaw.map((it) => {
    const tags = [];
    if (it.category) tags.push(it.category);
    if (it.machine) tags.push('machine');
    if (it.belt) tags.push('belt');
    if (it.pipe) tags.push('pipe');
    if (it.module) tags.push('module');
    if (it.fuel) tags.push('fuel');
    if (it.technology) tags.push('technology');

    const iconId = it.icon ?? it.id ?? 'missing-icon';
    const icon = iconById.get(iconId) ?? iconById.get('missing-icon');

    return {
      key: { id: namespacedItemId(it.id) },
      name: it.name ?? it.id,
      ...(icon
        ? {
          iconSprite: {
            url: '/packs/aef/icons.webp',
            position: icon.position ?? '0px 0px',
            ...(icon.color ? { color: icon.color } : {}),
            size: 64,
          },
        }
        : {}),
      ...(tags.length ? { tags } : {}),
    };
  });

  const recipesRaw = Array.isArray(data.recipes) ? data.recipes : [];

  const maxByCategory = new Map();
  for (const r of recipesRaw) {
    const cat = r.category ?? 'unknown';
    const inCount = Object.keys(r.in ?? {}).length;
    const outCount = Object.keys(r.out ?? {}).length;
    const catCount = Object.keys(r.catalyst ?? {}).length + (Array.isArray(r.producers) ? r.producers.length : 0);
    const cur = maxByCategory.get(cat) ?? { in: 0, out: 0, cat: 0 };
    cur.in = Math.max(cur.in, inCount);
    cur.out = Math.max(cur.out, outCount);
    cur.cat = Math.max(cur.cat, catCount);
    maxByCategory.set(cat, cur);
  }

  const recipeTypes = Array.from(maxByCategory.entries()).map(([cat, max]) => {
    const displayName = categoryNameById.get(cat) ?? cat;
    return {
      key: `aef:category/${cat}`,
      displayName,
      renderer: 'slot_layout',
      slots: buildSlots(max.in, max.out, max.cat),
      paramSchema: {
        time: { displayName: 'Time', unit: 's', format: 'duration' },
        usage: { displayName: 'Usage' },
        cost: { displayName: 'Cost' },
      },
    };
  });

  recipeTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const recipes = [];
  for (const r of recipesRaw) {
    const slotContents = {};

    const ins = Object.entries(r.in ?? {}).sort(([a], [b]) => a.localeCompare(b));
    ins.forEach(([id, amt], idx) => {
      slotContents[`in${idx + 1}`] = { kind: 'item', id: namespacedItemId(id), amount: parseAmount(amt) };
    });

    const outs = Object.entries(r.out ?? {}).sort(([a], [b]) => a.localeCompare(b));
    outs.forEach(([id, amt], idx) => {
      slotContents[`out${idx + 1}`] = { kind: 'item', id: namespacedItemId(id), amount: parseAmount(amt) };
    });

    const cats = [];
    if (r.catalyst) {
      Object.entries(r.catalyst).forEach(([id, amt]) => {
        cats.push({ id, amt });
      });
    }
    if (Array.isArray(r.producers)) {
      r.producers.forEach((id) => cats.push({ id, amt: 1 }));
    }
    cats
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach(({ id, amt }, idx) => {
        slotContents[`cat${idx + 1}`] = { kind: 'item', id: namespacedItemId(id), amount: parseAmount(amt) };
      });

    const params = {};
    if (r.time !== undefined) params.time = parseAmount(r.time);
    if (r.usage !== undefined) params.usage = parseAmount(r.usage);
    if (r.cost !== undefined) params.cost = parseAmount(r.cost);

    recipes.push({
      id: `aef:${r.id}`,
      type: `aef:category/${r.category ?? 'unknown'}`,
      slotContents,
      ...(Object.keys(params).length ? { params } : {}),
    });
  }

  const tagValuesByTagId = new Map();
  for (const it of itemsRaw) {
    if (!it.category) continue;
    const tagId = `aef:${it.category}`;
    const list = tagValuesByTagId.get(tagId) ?? [];
    list.push(namespacedItemId(it.id));
    tagValuesByTagId.set(tagId, list);
  }
  const tags = { item: {} };
  for (const [tagId, values] of tagValuesByTagId.entries()) {
    values.sort();
    tags.item[tagId] = { values };
  }

  ensureDir(outDir);
  const iconSheetSrc = path.resolve(path.dirname(source), 'icons.webp');
  const iconSheetDst = path.join(outDir, 'icons.webp');
  if (fs.existsSync(iconSheetSrc)) {
    fs.copyFileSync(iconSheetSrc, iconSheetDst);
  }

  writeJson(path.join(outDir, 'manifest.json'), {
    packId: 'aef',
    gameId: 'aef',
    displayName: 'Arknights: Endfield',
    version,
    files: {
      items: 'items.json',
      tags: 'tags.json',
      recipeTypes: 'recipeTypes.json',
      recipes: 'recipes.json',
    },
  });

  writeJson(path.join(outDir, 'items.json'), items);
  writeJson(path.join(outDir, 'recipeTypes.json'), recipeTypes);
  writeJson(path.join(outDir, 'recipes.json'), recipes);
  writeJson(path.join(outDir, 'tags.json'), tags);

  console.log(`Wrote AEF pack to ${outDir}`);
}

main();
