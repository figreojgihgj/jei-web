<template>
  <div
    class="piece-card"
    :class="{
      'piece-card--selected': selected,
      'piece-card--placed': !!placedAnchor,
      'piece-card--unavailable': props.unavailable,
      'piece-card--dark': isDark,
      'piece-card--light': !isDark,
    }"
    @click="onSelect"
  >
    <div class="piece-head">
      <div class="piece-name">{{ props.label || piece.name }}</div>
      <div v-if="props.counterText" class="piece-counter">{{ props.counterText }}</div>
      <div class="piece-tools">
        <button
          type="button"
          class="tool-btn"
          title="Rotate"
          :disabled="props.canRotate === false"
          @click.stop="$emit('rotate', props.itemId)"
        >
          R
        </button>
        <button
          v-if="props.showPickup !== false"
          type="button"
          class="tool-btn"
          title="Pick Up"
          :disabled="props.canPickup === false || !placedAnchor"
          @click.stop="$emit('pickup', props.itemId)"
        >
          X
        </button>
      </div>
    </div>

    <div class="piece-preview" :style="previewStyle">
      <div
        v-for="cell in previewCells"
        :key="cell.key"
        class="piece-preview-cell"
        :class="{ 'piece-preview-cell--on': cell.on }"
        :style="{ backgroundColor: cell.on ? piece.color : undefined }"
      />
    </div>

    <div class="piece-footer">
      <span>rot {{ rotation * 90 }}deg</span>
      <span v-if="placedAnchor">at {{ placedAnchor.x }},{{ placedAnchor.y }}</span>
      <span v-else>{{ props.footerText || 'in pool' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { GridCell, PuzzlePieceDefinition } from './types';

const props = defineProps<{
  itemId: string;
  piece: PuzzlePieceDefinition;
  label?: string;
  footerText?: string;
  counterText?: string;
  rotation: number;
  selected: boolean;
  placedAnchor: GridCell | null;
  canRotate?: boolean;
  canPickup?: boolean;
  unavailable?: boolean;
  showPickup?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', itemId: string): void;
  (e: 'rotate', itemId: string): void;
  (e: 'pickup', itemId: string): void;
}>();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);

type CellWithKey = GridCell & { key: string };

function rotateCells(cells: GridCell[], rotation: number): CellWithKey[] {
  if (!cells.length) return [];
  const normRotation = ((rotation % 4) + 4) % 4;
  const rotated = cells.map((cell) => {
    if (normRotation === 0) return { x: cell.x, y: cell.y };
    if (normRotation === 1) return { x: cell.y, y: -cell.x };
    if (normRotation === 2) return { x: -cell.x, y: -cell.y };
    return { x: -cell.y, y: cell.x };
  });

  const minX = Math.min(...rotated.map((c) => c.x));
  const minY = Math.min(...rotated.map((c) => c.y));
  return rotated.map((cell) => ({
    x: cell.x - minX,
    y: cell.y - minY,
    key: `${cell.x - minX},${cell.y - minY}`,
  }));
}

const activeCells = computed(() => rotateCells(props.piece.cells, props.rotation));

const bounds = computed(() => {
  if (!activeCells.value.length) {
    return {
      width: 1,
      height: 1,
    };
  }
  const maxX = Math.max(...activeCells.value.map((c) => c.x));
  const maxY = Math.max(...activeCells.value.map((c) => c.y));
  return {
    width: maxX + 1,
    height: maxY + 1,
  };
});

const previewStyle = computed(() => ({
  gridTemplateColumns: `repeat(${bounds.value.width}, 20px)`,
  gridTemplateRows: `repeat(${bounds.value.height}, 20px)`,
}));

const previewCells = computed(() => {
  const active = new Set(activeCells.value.map((c) => c.key));
  const cells: Array<{ key: string; on: boolean }> = [];
  for (let y = 0; y < bounds.value.height; y += 1) {
    for (let x = 0; x < bounds.value.width; x += 1) {
      const key = `${x},${y}`;
      cells.push({
        key,
        on: active.has(key),
      });
    }
  }
  return cells;
});

function onSelect() {
  if (props.unavailable) return;
  emit('select', props.itemId);
}
</script>

<style scoped>
.piece-card {
  --pc-card-border: rgba(112, 139, 132, 0.35);
  --pc-card-bg: rgba(244, 250, 247, 0.94);
  --pc-text: #2e4a45;
  --pc-title: #40673b;
  --pc-chip-text: #355430;
  --pc-chip-border: rgba(123, 174, 97, 0.5);
  --pc-btn-bg: rgba(235, 243, 240, 0.95);
  --pc-btn-text: #2f4d46;
  --pc-btn-border: rgba(114, 143, 136, 0.45);
  --pc-btn-hover: rgba(123, 177, 97, 0.86);
  --pc-cell-bg: rgba(234, 242, 239, 0.9);
  --pc-footer-text: rgba(74, 99, 93, 0.84);
  border: 1px solid var(--pc-card-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--pc-card-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--pc-text);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.piece-card--dark {
  --pc-card-border: rgba(153, 183, 176, 0.3);
  --pc-card-bg: rgba(13, 21, 20, 0.85);
  --pc-text: #d4ebe6;
  --pc-title: #e7ffb4;
  --pc-chip-text: #e9fdb7;
  --pc-chip-border: rgba(201, 255, 78, 0.45);
  --pc-btn-bg: rgba(26, 35, 34, 0.95);
  --pc-btn-text: #c4d4d0;
  --pc-btn-border: rgba(157, 185, 177, 0.45);
  --pc-btn-hover: rgba(193, 255, 44, 0.8);
  --pc-cell-bg: rgba(25, 35, 34, 0.9);
  --pc-footer-text: rgba(186, 203, 197, 0.82);
}

.piece-card:hover {
  border-color: rgba(187, 255, 0, 0.45);
}

.piece-card--selected {
  border-color: rgba(194, 255, 50, 0.95);
  box-shadow: 0 0 14px rgba(194, 255, 50, 0.18);
}

.piece-card--placed {
  border-color: rgba(152, 227, 13, 0.6);
}

.piece-card--unavailable {
  border-color: rgba(255, 107, 107, 0.65);
  box-shadow: inset 0 0 0 1px rgba(255, 107, 107, 0.2);
  opacity: 0.7;
}

.piece-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.piece-name {
  font-size: 13px;
  color: var(--pc-title);
  font-weight: 600;
}

.piece-counter {
  font-size: 11px;
  color: var(--pc-chip-text);
  border: 1px solid var(--pc-chip-border);
  border-radius: 999px;
  padding: 1px 8px;
}

.piece-tools {
  display: inline-flex;
  gap: 6px;
}

.tool-btn {
  border: 1px solid var(--pc-btn-border);
  border-radius: 5px;
  background: var(--pc-btn-bg);
  color: var(--pc-btn-text);
  font-size: 11px;
  padding: 2px 7px;
  cursor: pointer;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--pc-btn-hover);
  color: var(--pc-title);
}

.tool-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.piece-preview {
  display: grid;
  gap: 3px;
  align-self: flex-start;
}

.piece-preview-cell {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(91, 108, 104, 0.4);
  background: var(--pc-cell-bg);
}

.piece-preview-cell--on {
  border-color: rgba(213, 255, 134, 0.8);
  box-shadow: inset 0 0 0 1px rgba(230, 255, 177, 0.25);
}

.piece-footer {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
  color: var(--pc-footer-text);
  font-family: 'Consolas', 'Courier New', monospace;
}
</style>
