<template>
  <span :class="textClasses" :style="textStyle">{{ element.text.text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TextInline } from '../../../types/wiki';
import { COLOR_MAP } from '../../../types/wiki';

const props = defineProps<{
  element: TextInline;
}>();

const textClasses = computed(() => ({
  'text-bold': props.element.bold,
  'text-italic': props.element.italic,
  'text-underline': props.element.underline,
  'text-strikethrough': props.element.strikethrough,
  'text-code': props.element.code,
}));

const textStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.element.color) {
    style.color = COLOR_MAP[props.element.color] || props.element.color;
  }

  return style;
});
</script>

<style scoped lang="scss">
.text-bold {
  font-weight: bold;
}

.text-italic {
  font-style: italic;
}

.text-underline {
  text-decoration: underline;
}

.text-strikethrough {
  text-decoration: line-through;
}

.text-code {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
</style>
