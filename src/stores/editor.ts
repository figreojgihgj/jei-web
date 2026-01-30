import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type {
  PackData,
  PackManifest,
  ItemDef,
  RecipeTypeDef,
  Recipe,
  PackTags,
} from '../jei/types';

export const useEditorStore = defineStore('editor', () => {
  const STORAGE_KEY = 'jei.editor.packData.v1';

  function makeDefaultManifest(): PackManifest {
    return {
      packId: 'new-pack',
      gameId: 'new-game',
      displayName: 'New Pack',
      version: '0.0.1',
      files: {
        items: 'items.json',
        tags: 'tags.json',
        recipeTypes: 'recipeTypes.json',
        recipes: 'recipes.json',
      },
    };
  }

  const manifest = ref<PackManifest>(makeDefaultManifest());

  const items = ref<ItemDef[]>([]);
  const recipeTypes = ref<RecipeTypeDef[]>([]);
  const recipes = ref<Recipe[]>([]);
  const tags = ref<PackTags>({});

  function loadPack(data: PackData) {
    manifest.value = data.manifest;
    items.value = data.items;
    recipeTypes.value = data.recipeTypes;
    recipes.value = data.recipes;
    tags.value = data.tags || {};
  }

  function resetPack() {
    manifest.value = makeDefaultManifest();
    items.value = [];
    recipeTypes.value = [];
    recipes.value = [];
    tags.value = {};
  }

  function exportPack(): PackData {
    return {
      manifest: JSON.parse(JSON.stringify(manifest.value)),
      items: JSON.parse(JSON.stringify(items.value)),
      recipeTypes: JSON.parse(JSON.stringify(recipeTypes.value)),
      recipes: JSON.parse(JSON.stringify(recipes.value)),
      tags: JSON.parse(JSON.stringify(tags.value)),
    };
  }

  function clearPersistedPack() {
    localStorage.removeItem(STORAGE_KEY);
  }

  (function tryRestorePersistedPack() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PackData;
      if (!parsed?.manifest) return;
      loadPack(parsed);
    } catch {
      return;
    }
  })();

  watch(
    [manifest, items, recipeTypes, recipes, tags],
    () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exportPack()));
      } catch {
        return;
      }
    },
    { deep: true },
  );

  // Items
  function addItem(item: ItemDef) {
    items.value.push(item);
  }

  function updateItem(index: number, item: ItemDef) {
    items.value[index] = item;
  }

  function deleteItem(index: number) {
    items.value.splice(index, 1);
  }

  // Recipe Types
  function addRecipeType(type: RecipeTypeDef) {
    recipeTypes.value.push(type);
  }

  function updateRecipeType(index: number, type: RecipeTypeDef) {
    recipeTypes.value[index] = type;
  }

  function deleteRecipeType(index: number) {
    recipeTypes.value.splice(index, 1);
  }

  // Recipes
  function addRecipe(recipe: Recipe) {
    recipes.value.push(recipe);
  }

  function updateRecipe(index: number, recipe: Recipe) {
    recipes.value[index] = recipe;
  }

  function deleteRecipe(index: number) {
    recipes.value.splice(index, 1);
  }

  return {
    manifest,
    items,
    recipeTypes,
    recipes,
    tags,
    loadPack,
    resetPack,
    exportPack,
    clearPersistedPack,
    addItem,
    updateItem,
    deleteItem,
    addRecipeType,
    updateRecipeType,
    deleteRecipeType,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  };
});
