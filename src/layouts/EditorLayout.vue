<template>
  <q-layout view="hHh Lpr lff">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>JEI Web Editor</q-toolbar-title>

        <q-space />

        <q-btn flat dense round icon="home" to="/" label="Back to App" />

        <q-btn flat dense round aria-label="Theme">
          <q-icon :name="themeIcon" />
          <q-menu>
            <q-list style="min-width: 120px">
              <q-item
                clickable
                :active="settingsStore.darkMode === 'auto'"
                @click="setTheme('auto')"
              >
                <q-item-section avatar>
                  <q-icon name="brightness_4" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>自动</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'light'"
                @click="setTheme('light')"
              >
                <q-item-section avatar>
                  <q-icon name="light_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>亮色</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'dark'"
                @click="setTheme('dark')"
              >
                <q-item-section avatar>
                  <q-icon name="dark_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>暗色</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Editor</q-item-label>

        <q-item to="/editor" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>Dashboard</q-item-section>
        </q-item>

        <q-item to="/editor/items" clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="category" />
          </q-item-section>
          <q-item-section>Items</q-item-section>
        </q-item>

        <q-item to="/editor/types" clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="build" />
          </q-item-section>
          <q-item-section>Recipe Types</q-item-section>
        </q-item>

        <q-item to="/editor/recipes" clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="receipt" />
          </q-item-section>
          <q-item-section>Recipes</q-item-section>
        </q-item>

        <q-item to="/editor/tags" clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="label" />
          </q-item-section>
          <q-item-section>Tags</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore, type DarkMode } from 'src/stores/settings';
import { Dark } from 'quasar';

const settingsStore = useSettingsStore();
const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const themeIcon = computed(() => {
  if (settingsStore.darkMode === 'auto') {
    return Dark.isActive ? 'dark_mode' : 'light_mode';
  }
  return settingsStore.darkMode === 'dark' ? 'dark_mode' : 'light_mode';
});

function setTheme(mode: DarkMode) {
  settingsStore.setDarkMode(mode);
}
</script>
