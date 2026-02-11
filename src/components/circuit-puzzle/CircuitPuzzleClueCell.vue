<template>
  <div class="clue-cell" :class="rootClass">
    <div class="clue-content" :class="{ 'clue-content--rotated': isRowAxis }">
      <template v-if="mode === 'numeric'">
        <div class="clue-number-lanes">
          <div v-for="part in partColumns" :key="`num-${part.color}`" class="clue-number-lane">
            <span class="clue-chip clue-chip--current" :style="chipStyle(part.color, true)">
              {{ formatScore(part.current) }}
            </span>
            <span class="clue-chip clue-number-row--target" :style="chipStyle(part.color, false)">
              {{ formatScore(part.target) }}
            </span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="clue-graphic-lanes" :style="graphicVars">
          <div
            v-for="lane in graphicLanes"
            :key="`lane-${lane.color}`"
            class="clue-graphic-lane"
          >
            <span
              v-for="unit in lane.units"
              :key="unit.key"
              class="clue-unit"
              :class="unit.classMap"
              :style="unit.style"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { ClueDisplayMode, PuzzleScorePart } from './types';

const props = defineProps<{
  mode: ClueDisplayMode;
  orientation: 'row' | 'col';
  target: number;
  current: number;
  targetParts?: PuzzleScorePart[];
  currentParts?: PuzzleScorePart[];
  focused: boolean;
  cellSize: number;
}>();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);

type PartView = {
  color: string;
  value: number;
};

type PartColumn = {
  color: string;
  target: number;
  current: number;
};

type GraphicUnitView = {
  key: string;
  classMap: Record<string, boolean>;
  style: Record<string, string>;
};

type GraphicLaneView = {
  color: string;
  units: GraphicUnitView[];
};

const safeCurrent = computed(() => Math.max(0, Number(props.current) || 0));
const safeTarget = computed(() => Math.max(0, Number(props.target) || 0));
const hasExplicitParts = computed(() => (props.targetParts?.length ?? 0) > 0);

const isRowAxis = computed(() => props.orientation === 'row');

const targetPartsView = computed(() => normalizeParts(props.targetParts, safeTarget.value));
const currentPartsView = computed(() => normalizeParts(props.currentParts, safeCurrent.value));

const scoreCompare = computed(() => compareParts(targetPartsView.value, currentPartsView.value));
const clueDone = computed(() =>
  hasExplicitParts.value ? scoreCompare.value.equal : isSameScore(safeCurrent.value, safeTarget.value),
);
const clueOverflow = computed(() =>
  hasExplicitParts.value
    ? !scoreCompare.value.equal && scoreCompare.value.overflow
    : safeCurrent.value > safeTarget.value && !isSameScore(safeCurrent.value, safeTarget.value),
);
const cluePending = computed(() => !clueDone.value && !clueOverflow.value);

const rootClass = computed(() => ({
  'clue-cell--done': clueDone.value,
  'clue-cell--overflow': clueOverflow.value,
  'clue-cell--pending': cluePending.value,
  'clue-cell--focused': props.focused,
  'clue-cell--numeric': props.mode === 'numeric',
  'clue-cell--graphic': props.mode === 'graphic',
  'clue-cell--dark': isDark.value,
  'clue-cell--light': !isDark.value,
}));

const partColumns = computed<PartColumn[]>(() => {
  const targetMap = aggregateParts(targetPartsView.value);
  const currentMap = aggregateParts(currentPartsView.value);

  const colors: string[] = [];
  for (const part of targetPartsView.value) {
    if (!colors.includes(part.color)) colors.push(part.color);
  }
  for (const part of currentPartsView.value) {
    if (!colors.includes(part.color)) colors.push(part.color);
  }

  return colors.map((color) => ({
    color,
    target: targetMap.get(color) ?? 0,
    current: currentMap.get(color) ?? 0,
  }));
});

const unitSize = computed(() => {
  const raw = Math.floor((props.cellSize - 12) / 4);
  return Math.max(6, Math.min(9, raw));
});

const graphicVars = computed(() => ({
  '--clue-unit-size': `${unitSize.value}px`,
}));

const graphicLanes = computed<GraphicLaneView[]>(() =>
  partColumns.value.map((part, partIndex) => {
    const target = Math.max(0, Math.round(part.target));
    const current = Math.max(0, Math.round(part.current));
    const total = Math.max(target, current);
    const units: GraphicUnitView[] = [];

    for (let i = 0; i < total; i += 1) {
      const active = i < current;
      const inTarget = i < target;
      units.push({
        key: `${part.color}-${partIndex}-${i}`,
        classMap: {
          'clue-unit--filled': active && inTarget,
          'clue-unit--hollow': !active && inTarget,
          'clue-unit--overflow': active && !inTarget,
        },
        style: {
          backgroundColor:
            active && inTarget
              ? withAlpha(part.color, 0.95)
              : !active && inTarget
                ? withAlpha(part.color, 0.16)
                : active && !inTarget
                  ? 'rgba(255, 102, 102, 0.95)'
                  : 'rgba(21, 34, 30, 0.9)',
          borderColor:
            active && !inTarget
              ? 'rgba(255, 167, 167, 0.95)'
              : withAlpha(part.color, active && inTarget ? 0.85 : 0.55),
          boxShadow:
            active && inTarget
              ? `0 0 6px ${withAlpha(part.color, 0.38)}`
              : active && !inTarget
                ? '0 0 6px rgba(255, 102, 102, 0.35)'
                : 'none',
        },
      });
    }

    return { color: part.color, units };
  }),
);

function normalizeParts(parts: PuzzleScorePart[] | undefined, fallback: number): PartView[] {
  const out: PartView[] = [];
  for (const part of parts ?? []) {
    if (!part) continue;
    const value = Number(part.value);
    const color = normalizeColor(part.color);
    if (!Number.isFinite(value) || value <= 0) continue;
    out.push({ color, value });
  }
  if (!out.length && fallback > 0) {
    out.push({ color: '#9ddb22', value: fallback });
  }
  return out;
}

function aggregateParts(parts: PartView[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const part of parts) {
    map.set(part.color, (map.get(part.color) ?? 0) + part.value);
  }
  return map;
}

function formatScore(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.abs(safe - Math.round(safe)) < 1e-6) {
    return String(Math.round(safe));
  }
  return safe.toFixed(1);
}

function normalizeColor(input: string): string {
  const raw = (input || '').trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
    return raw.toLowerCase();
  }
  return '#9ddb22';
}

function chipStyle(color: string, current: boolean): Record<string, string> {
  return {
    borderColor: withAlpha(color, current ? 0.9 : 0.75),
    backgroundColor: withAlpha(color, current ? 0.35 : 0.14),
    color: current ? '#f3ffd2' : '#d5e6da',
  };
}

function withAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = normalizeColor(color);
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!match || !match[1]) return color;
  const raw = match[1];
  const full = raw.length === 3 ? raw.split('').map((ch) => `${ch}${ch}`).join('') : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function compareParts(targetParts: PartView[], currentParts: PartView[]): { equal: boolean; overflow: boolean } {
  const targetMap = new Map<string, number>();
  const currentMap = new Map<string, number>();

  for (const part of targetParts) {
    targetMap.set(part.color, (targetMap.get(part.color) ?? 0) + part.value);
  }
  for (const part of currentParts) {
    currentMap.set(part.color, (currentMap.get(part.color) ?? 0) + part.value);
  }

  const colors = new Set([...targetMap.keys(), ...currentMap.keys()]);
  let equal = true;
  let overflow = false;
  for (const color of colors) {
    const target = targetMap.get(color) ?? 0;
    const current = currentMap.get(color) ?? 0;
    if (!isSameScore(current, target)) equal = false;
    if (current - target > 1e-6) overflow = true;
  }

  return { equal, overflow };
}

function isSameScore(a: number, b: number): boolean {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 1e-6;
}
</script>

<style scoped>
.clue-cell {
  --cc-border: rgba(128, 165, 101, 0.45);
  --cc-bg: rgba(236, 244, 240, 0.9);
  --cc-lane-bg: rgba(220, 235, 228, 0.75);
  --cc-chip-border: rgba(122, 174, 93, 0.5);
  --cc-focus: rgba(120, 170, 96, 0.48);
  --cc-overflow: rgba(220, 91, 91, 0.9);
  --cc-done: rgba(139, 197, 63, 0.95);
  width: 100%;
  height: 100%;
  border: 1px solid var(--cc-border);
  border-radius: 4px;
  background: var(--cc-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
  overflow: hidden;
}
.clue-cell--dark {
  --cc-border: rgba(187, 255, 0, 0.35);
  --cc-bg: rgba(6, 13, 9, 0.75);
  --cc-lane-bg: rgba(12, 24, 20, 0.38);
  --cc-chip-border: rgba(187, 255, 0, 0.45);
  --cc-focus: rgba(223, 255, 141, 0.45);
  --cc-overflow: rgba(255, 95, 95, 0.9);
  --cc-done: rgba(198, 255, 73, 0.9);
}

.clue-cell--done {
  border-color: var(--cc-done);
  box-shadow: 0 0 8px rgba(198, 255, 73, 0.25);
}

.clue-cell--overflow {
  border-color: var(--cc-overflow);
}

.clue-cell--pending {
  border-color: var(--cc-border);
}

.clue-cell--focused {
  transform: translateY(-1px);
  box-shadow: 0 0 0 1px var(--cc-focus);
}

.clue-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transform-origin: center;
}

.clue-content--rotated {
  transform: rotate(-90deg);
}

.clue-number-lanes {
  display: flex;
  width: auto;
  height: 100%;
  gap: 3px;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
}

.clue-number-lane {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  padding: 1px;
  border-radius: 3px;
  background: var(--cc-lane-bg);
}

.clue-number-row--target {
  opacity: 0.9;
}

.clue-chip {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 10px;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 3px;
  border: 1px solid var(--cc-chip-border);
}

.clue-content--rotated .clue-chip {
  transform: rotate(90deg);
}

.clue-chip--current {
  font-weight: 700;
}

.clue-graphic-lanes {
  display: flex;
  width: auto;
  height: 100%;
  gap: 4px;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
}

.clue-graphic-lane {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-start;
  align-items: center;
  gap: 2px;
  padding: 1px;
  border-radius: 3px;
  background: var(--cc-lane-bg);
}

.clue-unit {
  width: var(--clue-unit-size);
  height: calc(var(--clue-unit-size) * 0.55);
  border-radius: 2px;
  border: 1px solid var(--cc-chip-border);
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}
</style>
