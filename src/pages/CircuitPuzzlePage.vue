<template>
  <q-page :class="['circuit-page', isDark ? 'circuit-page--dark' : 'circuit-page--light']">
    <div class="circuit-shell">
      <div class="circuit-toolbar">
        <div class="tab-group">
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === 'play' }"
            @click="activeTab = 'play'"
          >
            试玩
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === 'editor' }"
            @click="activeTab = 'editor'"
          >
            关卡编辑器
          </button>
        </div>

        <div class="toolbar-actions">
          <button type="button" class="toolbar-btn" @click="openCollectionPage">题目收录</button>
          <button type="button" class="toolbar-btn" @click="writeCurrentLevelToUrl">写入当前URL</button>
          <button type="button" class="toolbar-btn" @click="copyShareUrl">复制分享链接</button>
          <button type="button" class="toolbar-btn" @click="openAdvancedShare">高级共享</button>
          <button type="button" class="toolbar-btn" @click="restoreDefaultLevel">恢复默认关卡</button>
        </div>
      </div>
      <p v-if="loadedFromUrl" class="toolbar-tip">当前关卡来自 URL 参数，可直接分享当前地址。</p>

      <div v-if="activeTab === 'play'" class="tab-panel">
        <CircuitPuzzleGame :level="activeLevel" />
      </div>

      <div v-else class="tab-panel">
        <CircuitPuzzleLevelEditor v-model:level="activeLevel" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CircuitPuzzleGame from 'src/components/circuit-puzzle/CircuitPuzzleGame.vue';
import CircuitPuzzleLevelEditor from 'src/components/circuit-puzzle/CircuitPuzzleLevelEditor.vue';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from 'src/components/circuit-puzzle/defaultLevel';
import { decodeLevelFromSharedUrl } from 'src/components/circuit-puzzle/url-format-share';
import { buildSharePayload, getShareValue, resolveShareMode } from 'src/components/circuit-puzzle/url-share-options';
import type { PuzzleLevelDefinition } from 'src/components/circuit-puzzle/types';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const isDark = computed(() => $q.dark.isActive);

const SHARE_QUERY_KEY = 'l';
const TAB_QUERY_KEY = 'tab';

const activeTab = ref<'play' | 'editor'>('play');
const activeLevel = ref<PuzzleLevelDefinition>(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
const loadedFromUrl = ref(false);
const lastLoadedShareCode = ref<string | null>(null);

function restoreDefaultLevel(): void {
  activeLevel.value = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
  loadedFromUrl.value = false;
  lastLoadedShareCode.value = null;
  const nextQuery = buildQueryFromRoute();
  delete nextQuery[SHARE_QUERY_KEY];
  void router.replace({ path: route.path, query: nextQuery }).catch(() => undefined);
}

function openCollectionPage(): void {
  void router.push('/circuit-puzzle-collection').catch(() => undefined);
}

function getSingleQueryValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function parseTab(value: unknown): 'play' | 'editor' | null {
  const raw = getSingleQueryValue(value);
  if (raw === 'play' || raw === 'editor') return raw;
  return null;
}

function buildQueryFromRoute(): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(route.query)) {
    const value = getSingleQueryValue(raw);
    if (value === null) continue;
    next[key] = value;
  }
  return next;
}

function loadLevelFromQuery(rawCode: string | null): void {
  if (!rawCode) {
    loadedFromUrl.value = false;
    lastLoadedShareCode.value = null;
    return;
  }
  if (rawCode === lastLoadedShareCode.value) return;

  try {
    const decoded = decodeLevelFromSharedUrl(rawCode);
    activeLevel.value = cloneLevel(decoded);
    loadedFromUrl.value = true;
    lastLoadedShareCode.value = rawCode;
  } catch {
    loadedFromUrl.value = false;
    $q.notify({
      type: 'negative',
      message: 'URL 关卡解析失败，已保留当前关卡。',
    });
  }
}

function toShareRoute(encoded: string): { path: string; query: Record<string, string> } {
  const query = buildQueryFromRoute();
  query[SHARE_QUERY_KEY] = encoded;
  query[TAB_QUERY_KEY] = activeTab.value;
  return {
    path: route.path,
    query,
  };
}

function buildShareUrl(encoded: string): string {
  const resolved = router.resolve(toShareRoute(encoded));
  return new URL(resolved.href, window.location.origin).toString();
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  window.prompt('请复制以下内容', text);
}

async function copyShareUrl(): Promise<void> {
  try {
    const payload = buildSharePayload(activeLevel.value);
    const mode = resolveShareMode(payload, 'auto');
    const encoded = getShareValue(payload, mode);
    const url = buildShareUrl(encoded);
    await copyText(url);
    $q.notify({ type: 'positive', message: `分享链接已复制（${mode}，${encoded.length} 字符）。` });
  } catch {
    $q.notify({ type: 'negative', message: '生成分享链接失败。' });
  }
}

function writeCurrentLevelToUrl(): void {
  try {
    const payload = buildSharePayload(activeLevel.value);
    const mode = resolveShareMode(payload, 'auto');
    const encoded = getShareValue(payload, mode);
    void router.replace(toShareRoute(encoded)).catch(() => undefined);
    loadedFromUrl.value = true;
    lastLoadedShareCode.value = encoded;
    $q.notify({ type: 'positive', message: `已将当前关卡写入 URL（${mode}，${encoded.length} 字符）。` });
  } catch {
    $q.notify({ type: 'negative', message: '写入 URL 失败。' });
  }
}

function openAdvancedShare(): void {
  const payload = buildSharePayload(activeLevel.value);
  const autoMode = resolveShareMode(payload, 'auto');
  const autoLength = payload.lengths[autoMode];

  $q.dialog({
    title: '高级共享',
    message: '选择共享格式',
    options: {
      type: 'radio',
      model: 'auto',
      isValid: (val: unknown) => ['auto', 'v2', 'v1', 'json'].includes(String(val)),
      items: [
        { label: `自动最短（当前 ${autoMode}，${autoLength} 字符）`, value: 'auto' },
        { label: `v2 链接（${payload.lengths.v2} 字符）`, value: 'v2' },
        { label: `v1 链接（${payload.lengths.v1} 字符）`, value: 'v1' },
        { label: `复制 JSON（${payload.lengths.json} 字符）`, value: 'json' },
      ],
    },
    cancel: true,
    ok: { label: '复制' },
  }).onOk((modeValue: unknown) => {
    void (async () => {
      const mode = ['auto', 'v1', 'v2', 'json'].includes(String(modeValue))
        ? (String(modeValue) as 'auto' | 'v1' | 'v2' | 'json')
        : 'auto';
      const resolvedMode = resolveShareMode(payload, mode);
      const content = getShareValue(payload, mode);

      if (resolvedMode === 'json') {
        await copyText(content);
        $q.notify({ type: 'positive', message: `JSON 已复制（${content.length} 字符）。` });
        return;
      }

      const url = buildShareUrl(content);
      await copyText(url);
      $q.notify({
        type: 'positive',
        message: `分享链接已复制（${resolvedMode}，${content.length} 字符）。`,
      });
    })();
  });
}

watch(
  () => route.query[TAB_QUERY_KEY],
  (value) => {
    const tab = parseTab(value);
    if (!tab) return;
    if (activeTab.value !== tab) activeTab.value = tab;
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  const current = parseTab(route.query[TAB_QUERY_KEY]);
  if (current === tab) return;
  const nextQuery = buildQueryFromRoute();
  nextQuery[TAB_QUERY_KEY] = tab;
  void router.replace({ path: route.path, query: nextQuery }).catch(() => undefined);
});

watch(
  () => getSingleQueryValue(route.query[SHARE_QUERY_KEY]),
  (rawCode) => {
    loadLevelFromQuery(rawCode);
  },
  { immediate: true },
);
</script>

<style scoped>
.circuit-page {
  --cp-page-bg: #f1f7f4;
  --cp-btn-border: rgba(114, 145, 137, 0.45);
  --cp-btn-bg: rgba(235, 243, 240, 0.95);
  --cp-btn-text: #2f4d46;
  --cp-btn-hover-border: rgba(124, 178, 95, 0.9);
  --cp-btn-accent: #6f9f23;
  --cp-tip-color: #49645f;
  padding: 12px;
  background: var(--cp-page-bg);
}
.circuit-page--dark {
  --cp-page-bg: #0b1412;
  --cp-btn-border: rgba(163, 185, 179, 0.4);
  --cp-btn-bg: rgba(26, 35, 34, 0.95);
  --cp-btn-text: #d2e1dd;
  --cp-btn-hover-border: rgba(198, 255, 73, 0.88);
  --cp-btn-accent: #e8ff9f;
  --cp-tip-color: #cfe3df;
}

.circuit-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.circuit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-group {
  display: inline-flex;
  gap: 6px;
}

.tab-btn,
.toolbar-btn {
  border: 1px solid var(--cp-btn-border);
  border-radius: 8px;
  background: var(--cp-btn-bg);
  color: var(--cp-btn-text);
  font-size: 13px;
  line-height: 1;
  padding: 9px 12px;
  cursor: pointer;
}

.tab-btn--active {
  border-color: var(--cp-btn-hover-border);
  color: var(--cp-btn-accent);
  box-shadow: inset 0 0 0 1px rgba(198, 255, 73, 0.35);
}

.tab-panel {
  min-height: 1px;
}

.toolbar-tip {
  margin: 0;
  color: var(--cp-tip-color);
  font-size: 12px;
}
</style>
