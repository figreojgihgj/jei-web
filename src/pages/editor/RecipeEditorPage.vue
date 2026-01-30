<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h4">Recipes</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Add Recipe" @click="addRecipe" />
    </div>

    <div class="row q-col-gutter-md">
      <!-- List -->
      <div class="col-12 col-md-3">
        <q-input dense v-model="filter" placeholder="Search..." class="q-mb-sm">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-list bordered separator style="max-height: 80vh; overflow-y: auto">
          <q-item
            v-for="recipe in filteredRecipes"
            :key="recipe.id"
            clickable
            :active="selectedRecipeId === recipe.id"
            @click="selectRecipe(recipe.id)"
          >
            <q-item-section>
              <q-item-label class="text-weight-bold">{{
                getRecipeDisplayName(recipe)
              }}</q-item-label>
              <q-item-label caption>{{ recipe.id }}</q-item-label>
              <q-item-label caption class="text-xs">{{ recipe.type }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="deleteRecipe(recipe.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Editor -->
      <div class="col-12 col-md-9" v-if="currentRecipe">
        <q-card>
          <q-card-section>
            <div class="text-h6">Recipe Info</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="currentRecipe.id" label="ID" />
              </div>
              <div class="col-6">
                <q-select
                  v-model="currentRecipe.type"
                  :options="typeOptions"
                  label="Recipe Type"
                  emit-value
                  map-options
                  @update:model-value="onTypeChange"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="currentType && currentType.paramSchema">
            <div class="text-h6">Parameters</div>
            <div class="row q-col-gutter-sm">
              <template v-for="(schema, key) in currentType.paramSchema" :key="key">
                <div class="col-6 col-md-4">
                  <q-input
                    v-if="
                      schema.format === 'number' ||
                      schema.format === 'integer' ||
                      schema.format === 'percent'
                    "
                    type="number"
                    :model-value="getParamValue(key)"
                    @update:model-value="(val) => setParamValue(key, Number(val))"
                    :label="schema.displayName"
                    :suffix="schema.unit"
                    filled
                  />
                  <q-input
                    v-else
                    :model-value="getParamValue(key)"
                    @update:model-value="(val) => setParamValue(key, val)"
                    :label="schema.displayName"
                    :suffix="schema.unit"
                    filled
                  />
                </div>
              </template>
            </div>
            <div v-if="Object.keys(currentType.paramSchema).length === 0" class="text-grey">
              No parameters for this recipe type.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="currentType">
            <div class="text-h6 q-mb-sm">Slots</div>

            <!-- Visualization -->
            <div
              class="relative-position q-mb-md"
              :class="$q.dark.isActive ? 'bg-dark-canvas' : 'bg-grey-2'"
              style="height: 400px; border: 1px solid #ccc; overflow: auto"
            >
              <div
                v-for="(slot, idx) in currentType.slots"
                :key="idx"
                class="absolute flex flex-center slot-container"
                :class="getSlotClass(slot.slotId)"
                :style="{
                  left: slot.x * 32 + 'px',
                  top: slot.y * 32 + 'px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                }"
                @click="editSlot(slot.slotId)"
              >
                <q-tooltip>
                  {{ slot.slotId }} ({{ slot.io }})
                  <div v-if="currentRecipe.slotContents[slot.slotId]">
                    {{ getSlotContentSummary(currentRecipe.slotContents[slot.slotId]!) }}
                  </div>
                </q-tooltip>

                <!-- Content Rendering -->
                <div
                  v-if="getSlotDisplayInfo(slot.slotId)"
                  class="full-width full-height flex flex-center"
                  style="overflow: hidden"
                >
                  <div
                    v-if="getSlotDisplayInfo(slot.slotId)!.sprite"
                    style="width: 28px; height: 28px; position: relative"
                  >
                    <div :style="getSlotDisplayInfo(slot.slotId)!.sprite"></div>
                  </div>
                  <q-img
                    v-else-if="getSlotDisplayInfo(slot.slotId)!.icon"
                    :src="getSlotDisplayInfo(slot.slotId)!.icon"
                    width="28px"
                    height="28px"
                    fit="contain"
                  />
                  <div
                    v-else
                    class="text-xs text-center ellipsis"
                    style="font-size: 8px; line-height: 1"
                  >
                    {{ getSlotDisplayInfo(slot.slotId)!.label }}
                  </div>

                  <!-- Amount Badge -->
                  <q-badge
                    v-if="getSlotDisplayInfo(slot.slotId)!.amount > 1"
                    color="orange"
                    floating
                    transparent
                    class="text-xs"
                    style="right: -4px; top: -4px; font-size: 8px; padding: 2px 4px"
                  >
                    {{ getSlotDisplayInfo(slot.slotId)!.amount }}
                  </q-badge>
                </div>

                <!-- Empty Slot Placeholder -->
                <!-- No text for empty slots as requested -->
              </div>
            </div>

            <!-- Slot Editor -->
            <div v-if="selectedSlotId">
              <div class="text-subtitle1">Editing Slot: {{ selectedSlotId }}</div>

              <!-- Multiple Stacks (Variants) Support -->
              <div
                v-for="(stack, index) in currentSlotStacks"
                :key="index"
                class="q-mb-sm q-pa-sm rounded-borders"
                :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
              >
                <div class="row q-col-gutter-sm items-center">
                  <div class="col-12 col-md-3">
                    <q-select
                      v-model="stack.kind"
                      :options="['item', 'tag', 'fluid']"
                      label="Kind"
                      dense
                      options-dense
                    />
                  </div>
                  <div class="col-12 col-md-4">
                    <q-select
                      v-model="stack.id"
                      :options="itemOptions"
                      label="Item/Tag/Fluid ID"
                      use-input
                      fill-input
                      hide-selected
                      input-debounce="0"
                      @filter="(val, update) => filterStackIdOptions(stack.kind, val, update)"
                      dense
                      options-dense
                      emit-value
                      map-options
                      option-label="value"
                    >
                      <template v-slot:no-option>
                        <q-item>
                          <q-item-section class="text-grey"> No results </q-item-section>
                        </q-item>
                      </template>

                      <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                          <q-item-section avatar>
                            <div
                              v-if="scope.opt.sprite"
                              style="
                                width: 32px;
                                height: 32px;
                                position: relative;
                                overflow: hidden;
                              "
                            >
                              <div :style="scope.opt.sprite"></div>
                            </div>
                            <q-img
                              v-else-if="scope.opt.icon"
                              :src="scope.opt.icon"
                              width="32px"
                              height="32px"
                              fit="contain"
                            />
                            <q-icon v-else name="image_not_supported" size="24px" color="grey" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>{{ scope.opt.label }}</q-item-label>
                            <q-item-label caption>{{ scope.opt.value }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </template>
                    </q-select>
                  </div>
                  <div class="col-12 col-md-2">
                    <q-input v-model.number="stack.amount" type="number" label="Amount" dense />
                  </div>
                  <div class="col-12 col-md-3 text-right">
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="removeStack(index)"
                    />
                  </div>
                </div>
              </div>

              <div class="row q-mt-sm">
                <q-btn label="Add Variant" icon="add" flat color="primary" @click="addStack" />
                <q-space />
                <q-btn label="Save Slot" color="primary" @click="saveSlotContent" />
                <q-btn
                  label="Clear Slot"
                  flat
                  color="negative"
                  class="q-ml-sm"
                  @click="clearSlotContent"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-9 flex flex-center text-grey" v-else>
        Select or add a recipe to edit
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue';
import { useEditorStore } from 'src/stores/editor';
import type { SlotContent, Stack, Recipe, ItemDef } from 'src/jei/types';
import { useQuasar } from 'quasar';

const store = useEditorStore();
const $q = useQuasar();

const filter = ref('');
const selectedRecipeId = ref<string | null>(null);
const selectedSlotId = ref<string | null>(null);

// Slot editing state - now array of stacks
const currentSlotStacks = ref<Stack[]>([]);

const filteredRecipes = computed(() => {
  if (!filter.value) return store.recipes;
  const lower = filter.value.toLowerCase();
  return store.recipes.filter(
    (r) => r.id.toLowerCase().includes(lower) || r.type.toLowerCase().includes(lower),
  );
});

const currentRecipe = computed(() => {
  if (!selectedRecipeId.value) return null;
  return store.recipes.find((r) => r.id === selectedRecipeId.value);
});

const typeOptions = computed(() =>
  store.recipeTypes.map((t) => ({ label: t.displayName, value: t.key })),
);

const currentType = computed(() => {
  if (!currentRecipe.value) return null;
  return store.recipeTypes.find((t) => t.key === currentRecipe.value?.type);
});

interface ItemOption {
  label: string;
  value: string;
  icon?: string;
  sprite?: CSSProperties;
}

// Item Options for Autocomplete
const itemOptions = ref<ItemOption[]>([]);

function normalizeText(val: string | undefined | null): string {
  return String(val ?? '')
    .trim()
    .toLowerCase();
}

function filterStackIdOptions(
  kind: Stack['kind'],
  val: string,
  update: (callback: () => void) => void,
) {
  if (kind !== 'item') {
    update(() => {
      itemOptions.value = [];
    });
    return;
  }

  const needle = normalizeText(val);
  update(() => {
    itemOptions.value = store.items
      .map((item) => ({
        item,
        id: normalizeText(item.key.id),
        name: normalizeText(item.name),
      }))
      .filter(({ id, name }) => {
        if (!needle) return true;
        return id.includes(needle) || name.includes(needle);
      })
      .map(({ item, id, name }) => ({
        item,
        score: !needle
          ? 10
          : id === needle || name === needle
            ? 0
            : id.startsWith(needle) || name.startsWith(needle)
              ? 1
              : 2,
      }))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return (a.item.name || a.item.key.id).localeCompare(b.item.name || b.item.key.id);
      })
      .map(({ item }) => itemToOption(item));
  });
}

function itemToOption(item: ItemDef): ItemOption {
  const opt: ItemOption = {
    label: item.name || item.key.id,
    value: item.key.id,
  };
  if (item.icon) opt.icon = item.icon;
  if (item.iconSprite) opt.sprite = getSpriteStyle(item.iconSprite, 32);
  return opt;
}

function addRecipe() {
  const id = `recipe_${store.recipes.length}`;
  store.addRecipe({
    id,
    type: store.recipeTypes[0]?.key || '',
    slotContents: {},
  });
  selectedRecipeId.value = id;
}

function selectRecipe(id: string) {
  selectedRecipeId.value = id;
  selectedSlotId.value = null;
}

function deleteRecipe(id: string) {
  const idx = store.recipes.findIndex((r) => r.id === id);
  if (idx !== -1) {
    store.deleteRecipe(idx);
    if (selectedRecipeId.value === id) selectedRecipeId.value = null;
  }
}

function onTypeChange() {
  // Clear slots when type changes? Maybe optional.
  // if (currentRecipe.value) currentRecipe.value.slotContents = {};
}

// Params Handling
function getParamValue(key: string): string | number | null | undefined {
  if (!currentRecipe.value) return null;
  if (!currentRecipe.value.params) return null;
  const val = currentRecipe.value.params[key];
  if (val == null) return null;
  if (typeof val === 'string' || typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'bigint') return String(val);
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return null;
    }
  }
  return null;
}

function setParamValue(key: string, value: unknown) {
  if (!currentRecipe.value) return;
  if (!currentRecipe.value.params) currentRecipe.value.params = {};
  currentRecipe.value.params[key] = value;
}

// Slot Editing
function editSlot(slotId: string) {
  selectedSlotId.value = slotId;
  const content = currentRecipe.value?.slotContents[slotId];

  currentSlotStacks.value = [];

  if (content) {
    if (Array.isArray(content)) {
      // Deep copy to avoid direct mutation
      currentSlotStacks.value = JSON.parse(JSON.stringify(content));
    } else {
      currentSlotStacks.value = [JSON.parse(JSON.stringify(content))];
    }
  } else {
    // Start with one empty stack
    addStack();
  }
}

function addStack() {
  currentSlotStacks.value.push({
    kind: 'item',
    id: '',
    amount: 1,
  } as unknown as Stack);
}

function removeStack(index: number) {
  currentSlotStacks.value.splice(index, 1);
}

function saveSlotContent() {
  if (!currentRecipe.value || !selectedSlotId.value) return;

  // Filter out invalid stacks
  const validStacks = currentSlotStacks.value.filter((s) => s.id);

  if (validStacks.length === 0) {
    delete currentRecipe.value.slotContents[selectedSlotId.value];
  } else if (validStacks.length === 1) {
    currentRecipe.value.slotContents[selectedSlotId.value] = validStacks[0]!;
  } else {
    currentRecipe.value.slotContents[selectedSlotId.value] = validStacks;
  }
}

function clearSlotContent() {
  if (!currentRecipe.value || !selectedSlotId.value) return;
  delete currentRecipe.value.slotContents[selectedSlotId.value];
  currentSlotStacks.value = [];
  addStack();
}

function getSlotClass(slotId: string) {
  const base = 'slot-box ';
  if (slotId === selectedSlotId.value) return base + 'slot-selected';

  const hasContent = !!currentRecipe.value?.slotContents[slotId];
  if (hasContent) return base + 'slot-filled';

  return base + ($q.dark.isActive ? 'slot-empty-dark' : 'slot-empty');
}

function getSlotContentSummary(content: SlotContent) {
  if (Array.isArray(content)) return `${content.length} variants`;
  return `${content.amount}x ${content.id}`;
}

// Display Logic
function getRecipeDisplayName(recipe: Recipe) {
  // Try to find an output slot
  const typeDef = store.recipeTypes.find((t) => t.key === recipe.type);
  if (!typeDef || !typeDef.slots) return 'Unknown Recipe';

  const outputSlot = typeDef.slots.find((s) => s.io === 'output');
  if (outputSlot && recipe.slotContents[outputSlot.slotId]) {
    const content = recipe.slotContents[outputSlot.slotId];
    const stack = Array.isArray(content) ? content[0] : content;
    if (!stack) return 'Recipe';

    if (stack.kind === 'item') {
      const item = store.items.find((i) => i.key.id === stack.id);
      if (item) return item.name || item.key.id;
    }
    return stack.id;
  }

  return 'Recipe';
}

function getSlotDisplayInfo(slotId: string) {
  if (!currentRecipe.value || !currentRecipe.value.slotContents[slotId]) return null;

  const content = currentRecipe.value.slotContents[slotId];
  const stack = Array.isArray(content) ? content[0] : content;
  if (!stack) return null;

  const info = {
    label: stack.id,
    amount: stack.amount,
    icon: undefined as string | undefined,
    sprite: undefined as CSSProperties | undefined,
  };

  if (stack.kind === 'item') {
    const item = store.items.find((i) => i.key.id === stack.id);
    if (item) {
      info.label = item.name || item.key.id;
      if (item.iconSprite) {
        // Use 28px as target size for slot
        info.sprite = getSpriteStyle(item.iconSprite, 28);
      } else if (item.icon) {
        info.icon = item.icon;
      }
    }
  } else if (stack.kind === 'tag') {
    info.label = `Tag: ${stack.id}`;
    // Could add tag icon logic
  } else if (stack.kind === 'fluid') {
    info.label = `Fluid: ${stack.id}`;
    // Could add fluid icon logic
  }

  return info;
}

function getSpriteStyle(
  sprite: NonNullable<ItemDef['iconSprite']>,
  targetSize: number,
): CSSProperties {
  const size = sprite.size || 32;
  const scale = targetSize / size;

  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${sprite.url})`,
    backgroundPosition: sprite.position,
    backgroundColor: sprite.color || 'transparent',
    backgroundRepeat: 'no-repeat',
    display: 'inline-block',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'absolute',
    top: '0',
    left: '0',
  };
}
</script>

<style scoped>
.bg-dark-canvas {
  background-color: #1d1d1d;
}

.slot-container {
  border-radius: 4px;
  transition: all 0.2s;
  /* Use absolute positioning based on grid, but make them bigger */
}

.slot-box {
  /* Subtle border for empty slots */
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.slot-selected {
  border: 2px solid var(--q-primary);
  box-shadow: 0 0 5px var(--q-primary);
  z-index: 10;
}

.slot-filled {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(128, 128, 128, 0.5);
}

.slot-empty {
  /* Hide empty slots visually except for border/hover */
  background-color: transparent;
}

.slot-empty-dark {
  background-color: transparent;
}

/* Hover effect for empty slots to show they are interactive */
.slot-empty:hover,
.slot-empty-dark:hover {
  background-color: rgba(128, 128, 128, 0.1);
  border-color: rgba(128, 128, 128, 0.5);
}
</style>
