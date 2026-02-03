<template>
  <blockquote class="wiki-quote">
    <template v-for="entry in quoteEntries" :key="entry.id">
      <WikiBlock :block="entry.block" :block-map="blockMap" />
    </template>
  </blockquote>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WikiBlock from '../WikiBlock.vue';
import type { QuoteBlock, Block } from '../../../types/wiki';

const props = defineProps<{
  block: QuoteBlock;
  blockMap: Record<string, Block>;
}>();

const quoteEntries = computed(() => {
  return (props.block.quote.childIds || [])
    .map((id) => ({ id, block: props.blockMap[id] }))
    .filter((entry): entry is { id: string; block: Block } => Boolean(entry.block));
});
</script>

<style scoped lang="scss">
.wiki-quote {
  margin: 1em 0;
  padding: 1em 1.5em;
  border-left: 4px solid #1976d2;
  // background-color: #f5f5f5;
  border-radius: 0 4px 4px 0;

  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
