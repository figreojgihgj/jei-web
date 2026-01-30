<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h4">Tags</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Add Tag" @click="addTag" />
    </div>

    <div class="row q-col-gutter-md">
      <!-- Tag List -->
      <div class="col-12 col-md-3">
        <q-list bordered separator>
          <q-item
            v-for="tagId in tagIds"
            :key="tagId"
            clickable
            :active="selectedTagId === tagId"
            @click="selectedTagId = tagId"
          >
            <q-item-section>{{ tagId }}</q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="deleteTag(tagId)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Tag Editor -->
      <div class="col-12 col-md-9" v-if="selectedTagId && currentTagDef">
        <q-card>
          <q-card-section>
            <div class="text-h6">Tag: {{ selectedTagId }}</div>
            <q-toggle v-model="currentTagDef.replace" label="Replace Existing" />
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="text-subtitle1 q-mb-sm">Values (Item IDs)</div>

            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-grow">
                <q-select
                  v-model="newItemId"
                  :options="itemOptions"
                  label="Add Item to Tag"
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="0"
                  @filter="filterItems"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">No results</q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <div class="col-auto">
                <q-btn color="primary" label="Add" @click="addValue" :disable="!newItemId" />
              </div>
            </div>

            <q-list bordered separator>
              <q-item v-for="(val, idx) in currentTagValues" :key="idx">
                <q-item-section>
                  {{ typeof val === 'string' ? val : val.id }}
                  <q-item-label caption v-if="typeof val !== 'string' && val.required"
                    >Required</q-item-label
                  >
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="removeValue(idx)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-9 flex flex-center text-grey" v-else>
        Select or add a tag to edit
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'src/stores/editor';
import { useQuasar } from 'quasar';
import type { TagDef } from 'src/jei/types';

const store = useEditorStore();
const $q = useQuasar();

const selectedTagId = ref<string | null>(null);
const newItemId = ref('');

const tagIds = computed(() => {
  return store.tags.item ? Object.keys(store.tags.item) : [];
});

const currentTagDef = computed<TagDef | null>(() => {
  if (!selectedTagId.value || !store.tags.item) return null;
  return store.tags.item[selectedTagId.value] ?? null;
});

const currentTagValues = computed(() => currentTagDef.value?.values ?? []);

// Item Autocomplete
const itemOptions = ref<string[]>([]);
function filterItems(val: string, update: (callback: () => void) => void) {
  if (val === '') {
    update(() => {
      itemOptions.value = store.items.map((i) => i.key.id);
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    itemOptions.value = store.items
      .map((i) => i.key.id)
      .filter((v) => v.toLowerCase().indexOf(needle) > -1);
  });
}

function addTag() {
  $q.dialog({
    title: 'New Tag',
    message: 'Enter tag ID (e.g. "ores")',
    prompt: {
      model: '',
      isValid: (val) => val.length > 0 && (!store.tags.item || !store.tags.item[val]),
    },
    cancel: true,
    persistent: true,
  }).onOk((data) => {
    if (!store.tags.item) store.tags.item = {};
    store.tags.item[data] = { values: [] };
    selectedTagId.value = data;
  });
}

function deleteTag(id: string) {
  $q.dialog({
    title: 'Confirm',
    message: `Delete tag "${id}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    if (store.tags.item) {
      delete store.tags.item[id];
      if (selectedTagId.value === id) selectedTagId.value = null;
    }
  });
}

function addValue() {
  if (!newItemId.value) return;
  if (!currentTagDef.value) return;
  // Simple string value for now
  currentTagDef.value.values.push(newItemId.value);
  newItemId.value = '';
}

function removeValue(index: number) {
  if (!currentTagDef.value) return;
  currentTagDef.value.values.splice(index, 1);
}
</script>
