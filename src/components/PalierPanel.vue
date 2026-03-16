<template>
  <Transition name="palier-slide">
    <div
      v-if="jauge"
      class="rounded-xl border border-white/10 p-3 mt-2"
      style="background: rgba(255,255,255,0.05);"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <i :class="[cfg.iconClass, cfg.textClass, 'text-sm']" />
          <span class="text-sm font-bold" :class="cfg.textClass">{{ jauge.nom }}</span>
          <span class="text-xs font-mono text-white/50">{{ valeurFormatted }}</span>
        </div>
        <button
          class="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/70 transition-colors"
          @click="$emit('close')"
        >
          <i class="fa-solid fa-xmark text-xs" />
        </button>
      </div>

      <!-- Barre progression -->
      <div class="jauge-bar mb-2">
        <div
          class="jauge-bar-fill transition-all duration-300"
          :class="cfg.fillClass"
          :style="{ width: `${pct}%` }"
        />
      </div>

      <!-- Pills paliers -->
      <div class="flex gap-1 mb-2">
        <button
          v-for="p in PALIERS"
          :key="p.v"
          class="flex-1 rounded-lg py-1.5 text-xs font-bold transition-all duration-150"
          :class="etat.valeurActuelle === p.v
            ? `${cfg.fillClass} text-white shadow-md scale-105`
            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'"
          @click="$emit('setValeur', jauge.id, p.v)"
        >{{ p.l }}</button>
      </div>

      <!-- Input exact -->
      <input
        type="number"
        min="0"
        max="100000"
        step="1000"
        :value="etat.valeurActuelle"
        placeholder="valeur exacte"
        @change="onExactChange"
        class="w-full bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-center text-xs font-mono text-white/70 focus:outline-none focus:border-white/30 focus:text-white transition-colors"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Jauge, JaugeState, JaugeId } from '@/types'
import { JAUGES_CONFIGS } from '@/composables/jaugesConfig'

const PALIERS = [
  { v: 0,      l: 'MIN' },
  { v: 40000,  l: '40k' },
  { v: 70000,  l: '70k' },
  { v: 90000,  l: '90k' },
  { v: 100000, l: 'MAX' },
]

const props = defineProps<{
  jauge: Jauge | null
  etat: JaugeState | null
}>()

const emit = defineEmits<{
  close: []
  setValeur: [id: JaugeId, val: number]
}>()

const cfg = computed(() => props.jauge ? JAUGES_CONFIGS[props.jauge.id] : null)
const pct = computed(() => props.etat ? Math.round((props.etat.valeurActuelle / 100000) * 100) : 0)
const valeurFormatted = computed(() => props.etat?.valeurActuelle.toLocaleString('fr') ?? '0')

function onExactChange(e: Event) {
  if (!props.jauge) return
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v) && v >= 0 && v <= 100000) emit('setValeur', props.jauge.id, v)
}
</script>

<style scoped>
.palier-slide-enter-active,
.palier-slide-leave-active {
  transition: all 0.2s ease;
}
.palier-slide-enter-from,
.palier-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
