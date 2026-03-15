<template>
  <!-- Conteneur colonne : largeur fixe, hauteur explicite passée en prop -->
  <div
    class="relative shrink-0 flex items-end justify-center"
    :style="{ width: colWidth + 'px', height: barreHeight + 'px' }"
  >
    <!-- Fond de la barre (le "tube") -->
    <div
      class="absolute bottom-0"
      :style="{
        width: barWidth + 'px',
        height: '100%',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.07)',
        boxShadow: isActive ? config.glowShadow : 'none',
        cursor: 'pointer',
      }"
      @click="onBarreClick"
    >
      <!-- Fill coloré depuis le bas -->
      <div
        class="absolute bottom-0 left-0 w-full transition-all duration-150"
        :style="{
          height: pct(etat.valeurActuelle) + '%',
          background: config.fillColor,
          opacity: isActive ? 0.9 : 0.5,
          borderRadius: '3px',
        }"
      />

      <!-- Ligne objectif blanche (trait horizontal) si jauge active -->
      <div
        v-if="isActive && etat.objectif > 0"
        class="absolute left-0 right-0 pointer-events-none"
        :style="{
          bottom: pct(Math.max(0, etat.valeurActuelle - etat.objectif)) + '%',
          height: '2px',
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 0 5px rgba(255,255,255,0.6)',
          borderRadius: '1px',
          zIndex: 3,
        }"
      />

      <!-- Input range transparent pour drag vertical -->
      <input
        type="range"
        min="0" max="100000" step="1000"
        :value="etat.valeurActuelle"
        :aria-label="`Carburant ${jauge.nom}`"
        :aria-valuemin="0"
        :aria-valuemax="100000"
        :aria-valuenow="etat.valeurActuelle"
        @input="e => { emit('setValeur', parseInt((e.target as HTMLInputElement).value, 10)); dragging = true }"
        @change="dragging = false"
        @mousedown="dragging = true"
        @mouseup="dragging = false"
        @touchstart="dragging = true"
        @touchend="dragging = false"
        @click.stop
        class="absolute inset-0 opacity-0 cursor-pointer"
        style="writing-mode: vertical-lr; direction: rtl; width: 100%; height: 100%; margin: 0; padding: 0; z-index: 4;"
      />

      <!-- Infobulle valeur -->
      <div
        v-if="dragging"
        class="absolute left-1/2 pointer-events-none z-10 px-1.5 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap"
        :style="{
          bottom: pct(etat.valeurActuelle) + '%',
          transform: 'translate(-50%, 50%)',
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.2)',
        }"
      >
        {{ etat.valeurActuelle.toLocaleString('fr') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Jauge, JaugeState, JaugeId } from '@/types'
import { JAUGES_CONFIGS } from '@/composables/jaugesConfig'

const props = defineProps<{
  jauge: Jauge
  etat: JaugeState
  isActive: boolean
  isMaxReached: boolean
  colWidth: number
  barWidth: number
  barreHeight: number
}>()

const emit = defineEmits<{
  toggle: []
  setValeur: [val: number]
  setObjectif: [val: number]
}>()

const config = computed(() => JAUGES_CONFIGS[props.jauge.id])
const dragging = ref(false)

// % depuis le bas (0 = vide, 100 = plein)
function pct(val: number) {
  return Math.max(0, Math.min(100, (val / 100000) * 100))
}

function onBarreClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = 1 - ((e.clientY - rect.top) / rect.height)
  emit('setValeur', Math.max(0, Math.min(100000, Math.round(ratio * 100000 / 1000) * 1000)))
}
</script>
