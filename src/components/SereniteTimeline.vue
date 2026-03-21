<template>
  <div
    class="rounded-2xl border border-white/10 px-5 py-4"
    style="background: rgba(255,255,255,0.03);"
  >
    <!-- En-tête -->
    <div class="mb-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <img src="/icons/icon_tips.webp" class="w-8 h-8 object-contain" />
      </div>
      <div class="flex-1">
        <h2 class="font-bold text-lg text-white leading-tight">Tips</h2>
        <p class="text-xs text-white/40">Jauge(s) activable(s) selon la sérénité</p>
      </div>
      <!-- Input sérénité -->
      <div class="flex items-center gap-1">
        <button
          class="rounded-lg px-2 py-1 text-xs font-bold text-white/50 hover:text-white/80 transition-colors"
          style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);"
          @click="cursorValue = AXIS_MIN"
        >MIN</button>
        <input
          type="number"
          :min="AXIS_MIN" :max="AXIS_MAX"
          :value="cursorValue"
          @change="e => cursorValue = Math.max(AXIS_MIN, Math.min(AXIS_MAX, parseInt((e.target as HTMLInputElement).value) || 0))"
          class="rounded-lg text-center text-sm font-mono font-bold text-white focus:outline-none"
          style="width: 72px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); padding: 4px 4px;"
        />
        <button
          class="rounded-lg px-2 py-1 text-xs font-bold text-white/50 hover:text-white/80 transition-colors"
          style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);"
          @click="cursorValue = AXIS_MAX"
        >MAX</button>
      </div>
    </div>

    <!-- Timeline -->
    <div class="relative" style="padding: 0 16px; overflow: visible;">

      <!-- Zone bulles icônes -->
      <div class="relative" style="height: 60px; margin-bottom: 8px;">
        <template v-for="bubble in BUBBLES_TOP" :key="bubble.id">
          <div
            class="absolute flex flex-col items-center transition-all duration-300"
            style="bottom: 0; transform: translateX(-50%);"
            :style="{
              left: toPercent(bubble.v) + '%',
              opacity: activeBubble === bubble.id ? 1 : 0.3,
              transform: `translateX(-50%) scale(${activeBubble === bubble.id ? 1.15 : 1})`,
            }"
          >
            <!-- Bulle simple -->
            <div v-if="bubble.icons.length === 1"
              class="flex items-center justify-center rounded-full transition-all duration-300"
              style="width: 36px; height: 36px; font-size: 13px; border: 2px solid;"
              :style="{
                background: bubble.icons[0].bg,
                borderColor: bubble.icons[0].border,
                color: bubble.icons[0].color,
                boxShadow: activeBubble === bubble.id ? '0 0 16px ' + bubble.icons[0].glow : '0 2px 12px ' + bubble.icons[0].glow,
              }"
            >
              <i :class="bubble.icons[0].iconClass" aria-hidden="true" />
            </div>
            <!-- Double bulle en diagonale -->
            <div v-else style="position: relative; width: 44px; height: 44px; transform: translateX(8px);">
              <div v-for="(icon, idx) in bubble.icons" :key="idx"
                class="flex items-center justify-center rounded-full"
                style="width: 30px; height: 30px; font-size: 11px; border: 2px solid; position: absolute;"
                :style="{
                  background: icon.bg,
                  borderColor: icon.border,
                  color: icon.color,
                  top:  idx === 0 ? '14px' : '0px',
                  left: idx === 0 ? '0px'  : '14px',
                  zIndex: idx === 0 ? 1 : 2,
                  boxShadow: activeBubble === bubble.id ? '0 0 16px ' + icon.glow : '0 2px 10px ' + icon.glow,
                }"
              >
                <i :class="icon.iconClass" aria-hidden="true" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Marqueurs (labels + ticks) au-dessus de la barre -->
      <div class="relative select-none" style="height: 22px; margin-bottom: 2px;">
        <template v-for="m in MARKERS" :key="m.v">
          <span
            class="absolute"
            style="transform: translateX(-50%); top: 0; font-size: 10px; color: rgba(255,255,255,0.65);
                   white-space: nowrap; font-variant-numeric: tabular-nums; line-height: 1;"
            :style="{ left: toPercent(m.v) + '%' }"
          >{{ m.label }}</span>
          <div
            class="absolute"
            style="width: 1px; height: 6px; background: rgba(255,255,255,0.5); bottom: 0; transform: translateX(-50%);"
            :style="{ left: toPercent(m.v) + '%' }"
          />
        </template>
      </div>

      <!-- Barre + curseur -->
      <div
        ref="barRef"
        class="relative rounded-full overflow-visible cursor-pointer"
        style="height: 10px; background: rgba(255,255,255,0.06);"
        @mousedown="startDrag"
        @touchstart.prevent="startDrag"
      >
        <!-- Segments colorés -->
        <div
          class="absolute top-0 h-full rounded-full overflow-hidden"
          style="left: 0; right: 0;"
        >
          <div v-for="seg in segmentsComputed" :key="seg.id"
            class="absolute top-0 h-full transition-opacity duration-300"
            :style="{
              left: seg.left + '%',
              width: seg.width + '%',
              background: seg.color,
              opacity: seg.filled ? '1' : '0.15',
            }"
          />
        </div>
        <!-- Ticks -->
        <div v-for="m in MARKERS" :key="m.v"
          class="absolute top-0 h-full"
          style="width: 1px; background: rgba(255,255,255,0.25); z-index: 2;"
          :style="{ left: toPercent(m.v) + '%' }"
        />
        <!-- Curseur + infobulle -->
        <div
          class="absolute top-1/2 -translate-y-1/2"
          style="z-index: 10;"
          :style="{ left: `calc(${cursorPercent}% - 9px)` }"
        >
          <!-- Infobulle -->
          <div
            class="absolute flex flex-col items-center pointer-events-none"
            style="bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); white-space: nowrap;"
          >
            <div
              class="rounded-md px-2 py-1 text-xs font-bold"
              :style="{
                background: activeZone.color,
                color: '#fff',
                boxShadow: '0 2px 8px ' + activeZone.color + '88',
              }"
            >{{ cursorValue.toLocaleString('fr') }}</div>
            <div
              class="w-0 h-0"
              :style="{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid ' + activeZone.color,
              }"
            />
          </div>
          <!-- Rond -->
          <div
            class="rounded-full border-2 border-white"
            style="width: 18px; height: 18px; background: white; box-shadow: 0 0 10px rgba(255,255,255,0.6); cursor: grab;"
          />
        </div>
      </div>

      <!-- Zone smileys sous la barre -->
      <div class="relative" style="height: 64px; margin-top: 10px;">
        <template v-for="smiley in SMILEYS" :key="smiley.id">
          <div
            class="absolute transition-all duration-300"
            style="top: 50%; transform: translate(-50%, -50%);"
            :style="{
              left: toPercent(smiley.v) + '%',
              opacity: activeSmiley === smiley.id ? 1 : 0.3,
              transform: `translate(-50%, -50%) scale(${activeSmiley === smiley.id ? 1.15 : 1})`,
            }"
          >
            <img
              :src="smiley.img"
              :alt="smiley.id"
              style="width: 34px; height: 34px; object-fit: contain; display: block;"
            />
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const AXIS_MIN = -5000
const AXIS_MAX =  5000
const AXIS_RANGE = AXIS_MAX - AXIS_MIN

function toPercent(v: number): number {
  return ((v - AXIS_MIN) / AXIS_RANGE) * 100
}

function toValue(pct: number): number {
  return Math.round(AXIS_MIN + pct / 100 * AXIS_RANGE)
}

// Curseur : démarre à 0 (= 50%)
const cursorValue = ref(0)
const cursorPercent = computed(() => toPercent(cursorValue.value))

const barRef = ref<HTMLElement | null>(null)

function getPercentFromEvent(e: MouseEvent | TouchEvent): number {
  const bar = barRef.value
  if (!bar) return 50
  const rect = bar.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  return pct
}

function startDrag(e: MouseEvent | TouchEvent) {
  const pct = getPercentFromEvent(e)
  cursorValue.value = toValue(pct)

  const onMove = (ev: MouseEvent | TouchEvent) => {
    const p = getPercentFromEvent(ev)
    cursorValue.value = toValue(p)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('touchmove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchend', onUp)
}

// Zone active selon position du curseur
const ZONES = [
  { id: 'z1', min: -5000, max: -2001, bubbleId: 'b1', smileyId: 's1', color: '#f87171' },
  { id: 'z2', min: -2000, max:    -1, bubbleId: 'b2', smileyId: 's2', color: '#a78bfa' },
  { id: 'z3', min:     0, max:  1999, bubbleId: 'b3', smileyId: 's3', color: '#e879f9' },
  { id: 'z4', min:  2000, max:  5000, bubbleId: 'b4', smileyId: 's4', color: '#4ade80' },
]

const activeZone = computed(() =>
  ZONES.find(z => cursorValue.value >= z.min && cursorValue.value <= z.max) ?? ZONES[1]
)
const activeBubble = computed(() => activeZone.value.bubbleId)
const activeSmiley = computed(() => activeZone.value.smileyId)

// Segments : filled selon position du curseur
const SEGMENT_DEFS = [
  { id: 'z1', min: -5000, max: -2000, color: 'rgba(248,113,113,0.85)' },
  { id: 'z2', min: -2000, max:     0, color: 'rgba(167,139,250,0.85)' },
  { id: 'z3', min:     0, max:  2000, color: 'rgba(232,121,249,0.85)' },
  { id: 'z4', min:  2000, max:  5000, color: 'rgba(74,222,128,0.85)'  },
]

const segmentsComputed = computed(() =>
  SEGMENT_DEFS.map(s => ({
    ...s,
    left: toPercent(s.min),
    width: toPercent(s.max) - toPercent(s.min),
    filled: cursorValue.value >= s.max || (cursorValue.value > s.min && cursorValue.value <= s.max),
  }))
)

const MARKERS = [
  { v: -5000, label: '-5 000' },
  { v: -2000, label: '-2 000' },
  { v:     0, label: '0'      },
  { v:  2000, label: '+2 000' },
  { v:  5000, label: '+5 000' },
]

const C = {
  foudroyeur: { iconClass: 'fa-solid fa-bolt',    bg: 'rgba(250,204,21,0.15)',  border: 'rgba(250,204,21,0.7)',  color: '#facc15', glow: 'rgba(250,204,21,0.3)'  },
  abreuvoir:  { iconClass: 'fa-solid fa-droplet', bg: 'rgba(34,211,238,0.15)',  border: 'rgba(34,211,238,0.7)',  color: '#22d3ee', glow: 'rgba(34,211,238,0.3)'  },
  dragofesse: { iconClass: 'fa-solid fa-heart',   bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.7)', color: '#f87171', glow: 'rgba(248,113,113,0.3)' },
}

const BUBBLES_TOP = [
  { id: 'b1', v: -5000, icons: [C.foudroyeur] },
  { id: 'b2', v: -1000, icons: [C.foudroyeur, C.abreuvoir] },
  { id: 'b3', v:  1000, icons: [C.dragofesse, C.abreuvoir] },
  { id: 'b4', v:  5000, icons: [C.dragofesse] },
]

const SMILEYS = [
  { id: 's1', v: -3500, img: new URL('/icons/icon_smileyrouge.webp',  import.meta.url).href, color: '#f87171', rgb: '248,113,113' },
  { id: 's2', v: -1000, img: new URL('/icons/icon_smileyviolet.webp', import.meta.url).href, color: '#a78bfa', rgb: '167,139,250' },
  { id: 's3', v:  1000, img: new URL('/icons/icon_smileyrose.webp',   import.meta.url).href, color: '#e879f9', rgb: '232,121,249' },
  { id: 's4', v:  3500, img: new URL('/icons/icon_smileyvert.webp',   import.meta.url).href, color: '#4ade80', rgb: '74,222,128'  },
]
</script>
