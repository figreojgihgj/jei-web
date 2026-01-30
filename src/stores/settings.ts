import { defineStore } from 'pinia';
import { Dark } from 'quasar';

export type DarkMode = 'auto' | 'light' | 'dark';

function darkModeToQuasar(mode: DarkMode): boolean | 'auto' {
  if (mode === 'auto') return 'auto';
  return mode === 'dark';
}

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const defaults = {
      historyLimit: 6,
      debugLayout: false,
      recipeViewMode: 'panel' as 'dialog' | 'panel',
      recipeSlotShowName: true,
      selectedPack: 'aef',
      darkMode: 'auto' as DarkMode,
    };
    try {
      const raw = localStorage.getItem('jei.settings');
      if (!raw) {
        Dark.set('auto');
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<typeof defaults>;
      const darkMode =
        parsed.darkMode === 'auto' || parsed.darkMode === 'light' || parsed.darkMode === 'dark'
          ? parsed.darkMode
          : defaults.darkMode;
      Dark.set(darkModeToQuasar(darkMode));
      return {
        historyLimit: typeof parsed.historyLimit === 'number' ? parsed.historyLimit : defaults.historyLimit,
        debugLayout: typeof parsed.debugLayout === 'boolean' ? parsed.debugLayout : defaults.debugLayout,
        recipeViewMode: parsed.recipeViewMode === 'panel' ? 'panel' : 'dialog',
        recipeSlotShowName:
          typeof parsed.recipeSlotShowName === 'boolean'
            ? parsed.recipeSlotShowName
            : defaults.recipeSlotShowName,
        selectedPack: typeof parsed.selectedPack === 'string' ? parsed.selectedPack : defaults.selectedPack,
        darkMode,
      };
    } catch {
      Dark.set('auto');
      return defaults;
    }
  },
  actions: {
    setHistoryLimit(limit: number) {
      this.historyLimit = limit;
      this.save();
    },
    setDebugLayout(enabled: boolean) {
      this.debugLayout = enabled;
      this.save();
    },
    setRecipeViewMode(mode: 'dialog' | 'panel') {
      this.recipeViewMode = mode;
      this.save();
    },
    setRecipeSlotShowName(enabled: boolean) {
      this.recipeSlotShowName = enabled;
      this.save();
    },
    setSelectedPack(packId: string) {
      this.selectedPack = packId;
      this.save();
    },
    setDarkMode(mode: DarkMode) {
      this.darkMode = mode;
      Dark.set(darkModeToQuasar(mode));
      this.save();
    },
    save() {
      localStorage.setItem(
        'jei.settings',
        JSON.stringify({
          historyLimit: this.historyLimit,
          debugLayout: this.debugLayout,
          recipeViewMode: this.recipeViewMode,
          recipeSlotShowName: this.recipeSlotShowName,
          selectedPack: this.selectedPack,
          darkMode: this.darkMode,
        }),
      );
    },
  },
});
