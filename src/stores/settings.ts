import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const defaults = { historyLimit: 12, debugLayout: false };
    try {
      const raw = localStorage.getItem('jei.settings');
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<typeof defaults>;
      return {
        historyLimit: typeof parsed.historyLimit === 'number' ? parsed.historyLimit : defaults.historyLimit,
        debugLayout: typeof parsed.debugLayout === 'boolean' ? parsed.debugLayout : defaults.debugLayout,
      };
    } catch {
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
    save() {
      localStorage.setItem(
        'jei.settings',
        JSON.stringify({
          historyLimit: this.historyLimit,
          debugLayout: this.debugLayout,
        }),
      );
    },
  },
});
