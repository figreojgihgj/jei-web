<template>
  <div class="wiki-unknown-block">
    <q-banner class="bg-warning text-white">
      <template v-slot:avatar>
        <q-icon name="warning" />
      </template>
      未知的块类型: {{ block.kind }}
    </q-banner>
    <pre class="block-data">{{ JSON.stringify(block, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import type { Block } from '../../../types/wiki';

defineProps<{
  block: Block;
}>();
</script>

<style scoped lang="scss">
.wiki-unknown-block {
  margin: 1em 0;

  .block-data {
    margin-top: 1em;
    padding: 1em;
    // background-color: #f5f5f5;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
  }
}
</style>
