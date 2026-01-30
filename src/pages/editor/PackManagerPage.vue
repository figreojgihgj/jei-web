<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h4">Local Packs</div>
      <q-space />
      <q-btn color="primary" icon="save" label="Save As" @click="saveAs" :disable="!canSave" />
    </div>

    <q-card>
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-h6">Saved In Browser</div>
          <q-space />
          <q-badge color="grey-7" :label="`${packStore.entries.length}`" />
        </div>

        <q-list bordered separator v-if="packStore.entries.length">
          <q-item v-for="entry in packStore.entries" :key="entry.id">
            <q-item-section>
              <q-item-label>{{ entry.name }}</q-item-label>
              <q-item-label caption>{{ entry.packId }}</q-item-label>
              <q-item-label caption>{{ new Date(entry.updatedAt).toLocaleString() }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-sm items-center">
                <q-btn flat icon="play_arrow" @click="load(entry.id)" />
                <q-btn flat icon="delete" color="negative" @click="remove(entry.id)" />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="text-grey q-pa-md">No local packs yet</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { usePackManagerStore } from 'src/stores/packManager';
import { useEditorStore } from 'src/stores/editor';

const $q = useQuasar();
const packStore = usePackManagerStore();
const editorStore = useEditorStore();

const canSave = computed(() => true);

function load(id: string) {
  void packStore.loadLocalPack(id).catch((e) => {
    $q.notify({ type: 'negative', message: String(e) });
  });
}

function remove(id: string) {
  $q.dialog({
    title: 'Confirm',
    message: 'Delete this local pack?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void packStore.deleteLocalPack(id).catch((e) => {
      $q.notify({ type: 'negative', message: String(e) });
    });
  });
}

function saveAs() {
  $q.dialog({
    title: 'Save As',
    message: 'Local pack name',
    prompt: { model: editorStore.manifest.displayName || editorStore.manifest.packId || 'Pack' },
    cancel: true,
    persistent: true,
  }).onOk((name) => {
    void packStore.saveAs(String(name)).catch((e) => {
      $q.notify({ type: 'negative', message: String(e) });
    });
  });
}
</script>

