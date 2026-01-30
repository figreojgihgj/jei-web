<template>
  <div class="image-viewer" :class="{ 'image-viewer--dark': $q.dark.isActive }">
    <div
      class="viewer-canvas"
      ref="canvasRef"
      @wheel="onWheel"
      @dblclick="resetView"
      @mousedown="onPointerDown"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <div v-if="src" class="viewer-transform" :style="transformStyle">
        <q-img
          :src="src"
          :alt="name || 'image'"
          class="viewer-img"
          fit="contain"
          :draggable="false"
        />
      </div>
    </div>

    <div class="viewer-toolbar">
      <q-btn flat round dense icon="zoom_in" @click="zoomIn" />
      <q-btn flat round dense icon="zoom_out" @click="zoomOut" />

      <q-separator vertical spaced />

      <q-btn flat round dense icon="rotate_90_degrees_ccw" @click="rotateLeft" />
      <q-btn flat round dense icon="rotate_90_degrees_cw" @click="rotateRight" />

      <q-separator vertical spaced />

      <q-btn flat round dense icon="flip" @click="flipHorizontal" />
      <q-btn flat round dense icon="flip_camera_android" @click="flipVertical" />

      <q-space />

      <div class="scale-indicator">{{ Math.round(scale * 100) }}%</div>

      <q-btn flat dense class="q-ml-xs" icon="restore" @click="resetView" />
    </div>

    <div class="viewer-footer">
      <div class="file-name" :title="name">{{ name }}</div>
      <div class="viewer-hint">滚轮缩放 · 触摸板捏合/平移 · 拖拽查看 · 双击重置</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps<{
  src: string;
  name?: string;
}>();

const $q = useQuasar();

const canvasRef = ref<HTMLElement | null>(null);

const BASE_SCALE = 0.9;
const scale = ref(1);
const rotation = ref(0);
const offsetX = ref(0);
const offsetY = ref(0);
const flipX = ref(false);
const flipY = ref(false);

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const ZOOM_STEP = 0.15;

const isPanning = ref(false);
const panLastX = ref(0);
const panLastY = ref(0);

const isPinching = ref(false);
const initialPinchDistance = ref(0);
const initialPinchScale = ref(1);
const pinchCenterX = ref(0);
const pinchCenterY = ref(0);

const initialPinchAngle = ref(0);
const initialPinchRotation = ref(0);

const pinchOffsetX = ref(0);
const pinchOffsetY = ref(0);

const name = computed(() => props.name || '');

const transformStyle = computed(() => {
  const sx = scale.value * (flipX.value ? -1 : 1);
  const sy = scale.value * (flipY.value ? -1 : 1);
  return {
    transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0) rotate(${rotation.value}deg) scale(${sx * BASE_SCALE}, ${sy * BASE_SCALE})`,
  };
});

function clampScale(next: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
}

function zoomIn() {
  scale.value = clampScale(scale.value * (1 + ZOOM_STEP));
}

function zoomOut() {
  scale.value = clampScale(scale.value * (1 - ZOOM_STEP));
}

function rotateLeft() {
  rotation.value -= 90;
}

function rotateRight() {
  rotation.value += 90;
}

function flipHorizontal() {
  flipX.value = !flipX.value;
}

function flipVertical() {
  flipY.value = !flipY.value;
}

function resetView() {
  scale.value = 1;
  rotation.value = 0;
  offsetX.value = 0;
  offsetY.value = 0;
  flipX.value = false;
  flipY.value = false;
}

function onWheel(e: WheelEvent) {
  if (!props.src) return;
  e.preventDefault();
  e.stopPropagation();

  if (e.ctrlKey) {
    const delta = e.deltaY;
    const factor = delta > 0 ? 1 - ZOOM_STEP * 0.2 : 1 + ZOOM_STEP * 0.2;
    const newScale = clampScale(scale.value * factor);
    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const worldX = (mouseX - offsetX.value) / scale.value;
    const worldY = (mouseY - offsetY.value) / scale.value;
    scale.value = newScale;
    offsetX.value = mouseX - worldX * scale.value;
    offsetY.value = mouseY - worldY * scale.value;
    return;
  }

  const isMouseWheel = e.deltaMode === 1 || Math.abs(e.deltaY) >= 50;
  if (isMouseWheel) {
    const delta = e.deltaY;
    const factor = delta > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
    const newScale = clampScale(scale.value * factor);
    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const worldX = (mouseX - offsetX.value) / scale.value;
    const worldY = (mouseY - offsetY.value) / scale.value;
    scale.value = newScale;
    offsetX.value = mouseX - worldX * scale.value;
    offsetY.value = mouseY - worldY * scale.value;
  } else {
    offsetX.value += e.deltaX;
    offsetY.value += e.deltaY;
  }
}

function onPointerDown(e: MouseEvent) {
  if (!props.src) return;
  if (e.button !== 0) return;
  isPanning.value = true;
  panLastX.value = e.clientX;
  panLastY.value = e.clientY;

  const onMove = (ev: MouseEvent) => {
    if (!isPanning.value) return;
    const dx = ev.clientX - panLastX.value;
    const dy = ev.clientY - panLastY.value;
    panLastX.value = ev.clientX;
    panLastY.value = ev.clientY;
    offsetX.value += dx;
    offsetY.value += dy;
  };

  const onUp = () => {
    isPanning.value = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function getTouchDistance(t1: Touch, t2: Touch) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

function getTouchAngle(t1: Touch, t2: Touch) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function onTouchStart(e: TouchEvent) {
  if (!props.src) return;
  if (e.touches.length === 1) {
    isPanning.value = true;
    const t = e.touches[0];
    if (!t) return;
    panLastX.value = t.clientX;
    panLastY.value = t.clientY;
    return;
  }

  if (e.touches.length === 2) {
    isPinching.value = true;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    if (!t1 || !t2) return;

    initialPinchDistance.value = getTouchDistance(t1, t2);
    initialPinchScale.value = scale.value;
    initialPinchRotation.value = rotation.value;
    initialPinchAngle.value = getTouchAngle(t1, t2);

    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const centerX = (t1.clientX + t2.clientX) / 2;
    const centerY = (t1.clientY + t2.clientY) / 2;
    pinchCenterX.value = centerX - rect.left - rect.width / 2;
    pinchCenterY.value = centerY - rect.top - rect.height / 2;
    pinchOffsetX.value = offsetX.value;
    pinchOffsetY.value = offsetY.value;
  }
}

function onTouchMove(e: TouchEvent) {
  if (!props.src) return;
  if (isPinching.value && e.touches.length === 2) {
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    if (!t1 || !t2) return;
    const dist = getTouchDistance(t1, t2);
    const currentAngle = getTouchAngle(t1, t2);
    if (initialPinchDistance.value <= 0) return;
    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const centerX = (t1.clientX + t2.clientX) / 2;
    const centerY = (t1.clientY + t2.clientY) / 2;
    const currentCenterX = centerX - rect.left - rect.width / 2;
    const currentCenterY = centerY - rect.top - rect.height / 2;

    const ratio = dist / initialPinchDistance.value;
    const newScale = clampScale(initialPinchScale.value * ratio);
    const angleDiff = currentAngle - initialPinchAngle.value;
    const newRotation = initialPinchRotation.value + angleDiff;
    const centerMoveX = currentCenterX - pinchCenterX.value;
    const centerMoveY = currentCenterY - pinchCenterY.value;

    scale.value = newScale;
    rotation.value = newRotation;

    const worldX = pinchCenterX.value / initialPinchScale.value;
    const worldY = pinchCenterY.value / initialPinchScale.value;
    const transformCenterX = worldX * newScale;
    const transformCenterY = worldY * newScale;

    offsetX.value = pinchOffsetX.value + centerMoveX + (currentCenterX - transformCenterX);
    offsetY.value = pinchOffsetY.value + centerMoveY + (currentCenterY - transformCenterY);
    return;
  }

  if (isPanning.value && e.touches.length === 1) {
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - panLastX.value;
    const dy = t.clientY - panLastY.value;
    panLastX.value = t.clientX;
    panLastY.value = t.clientY;
    offsetX.value += dx;
    offsetY.value += dy;
  }
}

function onTouchEnd() {
  if (!props.src) return;
  if (isPinching.value) {
    isPinching.value = false;
    initialPinchDistance.value = 0;
    initialPinchAngle.value = 0;
    pinchOffsetX.value = 0;
    pinchOffsetY.value = 0;
  }
  if (isPanning.value) {
    isPanning.value = false;
  }
}
</script>

<style scoped>
.image-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}

.viewer-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  background: rgba(0, 0, 0, 0.03);
}

.image-viewer--dark .viewer-canvas {
  background: rgba(255, 255, 255, 0.06);
}

.viewer-transform {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

.viewer-img {
  max-width: 100%;
  max-height: 100%;
  pointer-events: none;
}

.viewer-toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.image-viewer--dark .viewer-toolbar {
  background: rgba(20, 20, 20, 0.82);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

.scale-indicator {
  font-size: 12px;
}

.viewer-footer {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.image-viewer--dark .viewer-footer {
  background: rgba(20, 20, 20, 0.82);
  color: rgba(255, 255, 255, 0.9);
}

.file-name {
  font-weight: 600;
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.viewer-hint {
  font-size: 11px;
  opacity: 0.8;
}
</style>
