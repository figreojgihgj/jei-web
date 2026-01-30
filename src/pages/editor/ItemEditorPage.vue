<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h4">Items</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Add Item" @click="openDialog()" />
    </div>

    <q-table
      :rows="store.items"
      :columns="columns"
      row-key="key.id"
      :filter="filter"
      :pagination="{ rowsPerPage: 20 }"
    >
      <template v-slot:top-right>
        <q-input dense debounce="300" v-model="filter" placeholder="Search">
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>

      <template v-slot:body-cell-icon="props">
        <q-td :props="props">
          <div v-if="props.row.iconSprite" :style="getSpriteStyle(props.row.iconSprite)"></div>
          <q-img
            v-else-if="props.row.icon"
            :src="props.row.icon"
            style="width: 32px; height: 32px"
            fit="contain"
          />
          <q-icon v-else name="image_not_supported" size="32px" color="grey" />
        </q-td>
      </template>

      <template v-slot:body-cell-tags="props">
        <q-td :props="props">
          <q-chip
            v-for="tag in props.row.tags"
            :key="tag"
            dense
            size="sm"
            color="secondary"
            text-color="white"
          >
            {{ tag }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" auto-width>
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="edit"
            @click="openDialog(props.row, props.rowIndex)"
          />
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete"
            @click="deleteItem(props.rowIndex)"
          />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialogOpen">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ isEdit ? 'Edit Item' : 'Add Item' }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="currentItem.key.id"
            label="ID"
            :readonly="isEdit"
            :rules="[(val) => !!val || 'Field is required']"
          />
          <q-input v-model="currentItem.name" label="Name" />
          <q-input v-model="currentItem.icon" label="Icon URL (Fallback)" />

          <div class="text-subtitle2">Icon Sprite</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-toggle v-model="hasSprite" label="Enable Sprite" />
            </div>
            <template v-if="hasSprite">
              <div class="col-12">
                <q-input v-model="currentItem.iconSprite!.url" label="Sprite URL" />
              </div>
              <div class="col-6">
                <q-input
                  v-model="currentItem.iconSprite!.position"
                  label="Position (e.g. -10px -20px)"
                />
              </div>
              <div class="col-3">
                <q-input
                  v-model.number="currentItem.iconSprite!.size"
                  type="number"
                  label="Size (px)"
                />
              </div>
              <div class="col-3">
                <q-input v-model="currentItem.iconSprite!.color" label="Color" />
              </div>
              <div class="col-12 flex flex-center q-pa-sm bg-grey-3">
                <div :style="getSpriteStyle(currentItem.iconSprite!)"></div>
              </div>
            </template>
          </div>

          <q-select
            v-model="currentItem.tags"
            label="Tags"
            use-input
            use-chips
            multiple
            hide-dropdown-icon
            input-debounce="0"
            @new-value="createTag"
          />

          <q-input v-model="currentItem.description" label="Description" type="textarea" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Save" color="primary" @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEditorStore } from 'src/stores/editor';
import type { ItemDef } from 'src/jei/types';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';

const store = useEditorStore();
const $q = useQuasar();

const filter = ref('');
const dialogOpen = ref(false);
const isEdit = ref(false);
const editIndex = ref(-1);
const hasSprite = ref(false);

const defaultItem: ItemDef = {
  key: { id: '' },
  name: '',
  tags: [],
};

const currentItem = ref<ItemDef>(JSON.parse(JSON.stringify(defaultItem)));

const columns: QTableColumn[] = [
  { name: 'icon', label: 'Icon', field: 'icon', align: 'center' },
  { name: 'id', label: 'ID', field: (row: ItemDef) => row.key.id, align: 'left', sortable: true },
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'tags', label: 'Tags', field: 'tags', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
];

watch(hasSprite, (val) => {
  if (val && !currentItem.value.iconSprite) {
    currentItem.value.iconSprite = {
      url: '',
      position: '0 0',
      size: 32,
    };
  } else if (!val) {
    delete currentItem.value.iconSprite;
  }
});

function openDialog(item?: ItemDef, index?: number) {
  if (item && index !== undefined) {
    isEdit.value = true;
    editIndex.value = index;
    currentItem.value = JSON.parse(JSON.stringify(item));
    hasSprite.value = !!currentItem.value.iconSprite;
  } else {
    isEdit.value = false;
    editIndex.value = -1;
    currentItem.value = JSON.parse(JSON.stringify(defaultItem));
    hasSprite.value = false;
  }
  dialogOpen.value = true;
}

function createTag(
  val: string,
  done: (item: string, mode: 'add' | 'add-unique' | 'toggle') => void,
) {
  if (val.length > 0) {
    done(val, 'add-unique');
  }
}

function saveItem() {
  if (!currentItem.value.key.id) {
    $q.notify({ type: 'warning', message: 'ID is required' });
    return;
  }

  if (isEdit.value) {
    store.updateItem(editIndex.value, currentItem.value);
  } else {
    // Check for duplicate ID
    if (store.items.some((i) => i.key.id === currentItem.value.key.id)) {
      $q.notify({ type: 'negative', message: 'Item ID already exists' });
      return;
    }
    store.addItem(currentItem.value);
  }
  dialogOpen.value = false;
}

function deleteItem(index: number) {
  $q.dialog({
    title: 'Confirm',
    message: 'Are you sure you want to delete this item?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    store.deleteItem(index);
  });
}

function getSpriteStyle(sprite: NonNullable<ItemDef['iconSprite']>) {
  const size = sprite.size || 32;
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${sprite.url})`,
    backgroundPosition: sprite.position,
    backgroundColor: sprite.color || 'transparent',
    backgroundRepeat: 'no-repeat',
    display: 'inline-block',
  };
}
</script>
