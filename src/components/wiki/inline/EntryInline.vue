<template>
  <a
    v-if="isInline"
    :href="`#/wiki/${element.entry.id}`"
    :class="['wiki-entry-inline', `show-type-${element.entry.showType}`]"
    @click.prevent="handleClick"
  >
    <ImageLoader
      v-if="displayCover"
      :url="displayCover"
      :alt="displayName"
      :max-width="20"
      :use-proxy="useProxy"
      :proxy-url="proxyUrl"
      variant="inline"
      class="entry-icon"
    />
    <q-icon v-else name="link" size="16px" />
    <span class="entry-id">{{ displayName }}</span>
    <span v-if="showCount" class="entry-count">×{{ element.entry.count }}</span>
  </a>

  <div v-else class="wiki-entry-card" @click="handleClick">
    <div class="card-icon">
      <ImageLoader
        v-if="displayCover"
        :url="displayCover"
        :alt="displayName"
        :use-proxy="useProxy"
        :proxy-url="proxyUrl"
        variant="inline"
      />
      <q-icon v-else name="inventory_2" size="24px" />
    </div>
    <div class="card-body">
      <div class="card-title">{{ displayName }}</div>
      <div v-if="showCount" class="card-count">×{{ element.entry.count }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import type { EntryInline, CatalogItemMap } from '../../../types/wiki';
import ImageLoader from '../ImageLoader.vue';

const props = defineProps<{
  element: EntryInline;
}>();

const catalogMap = inject<Ref<CatalogItemMap>>('wikiCatalogMap', ref({} as CatalogItemMap));
const useProxyRef = inject<Ref<boolean>>('wikiImageUseProxy', ref(false));
const proxyUrlRef = inject<Ref<string>>('wikiImageProxyUrl', ref(''));

const entryId = computed(() => String(props.element.entry.id ?? '').trim());

const catalogEntry = computed(() => {
  const direct = catalogMap.value[entryId.value];
  if (direct) return direct;
  const numericKey = String(Number(entryId.value));
  return catalogMap.value[numericKey];
});

const displayName = computed(() => {
  return catalogEntry.value?.name || props.element.entry.id;
});

const displayCover = computed(() => {
  return catalogEntry.value?.cover || '';
});

const showCount = computed(() => {
  return props.element.entry.count && props.element.entry.count !== '0';
});

const isInline = computed(() => props.element.entry.showType !== 'card-big');

const useProxy = computed(() => useProxyRef.value);
const proxyUrl = computed(() => proxyUrlRef.value);

function handleClick() {
  console.log('Navigate to entry:', props.element.entry.id);
  // TODO: 实现导航逻辑
}
</script>

<style scoped lang="scss">
.wiki-entry-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1976d2;
  text-decoration: none;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #e3f2fd;
  }

  .entry-id {
    font-weight: 500;
  }

  .entry-count {
    font-size: 0.9em;
    color: #666;
  }

  &.show-type-card-big {
    display: inline-flex;
  }
}

.entry-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 3px;
}

.wiki-entry-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;

  &:hover {
    background-color: #eeeeee;
    border-color: #d0d0d0;
  }
}

.card-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e0e0e0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-weight: 600;
  color: #333;
}

.card-count {
  font-size: 0.85em;
  color: #666;
}
</style>
