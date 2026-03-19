<template>
  <div
    class="card-dofus transition-all duration-300 select-none"
    :class="[
      isActive ? `border-opacity-60 ${config.borderClass}` : 'border-white/10',
      isActive ? config.glowClass : '',
    ]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <!-- Icon -->
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
          :class="[config.iconBg, isActive ? 'opacity-100' : 'opacity-60']"
        >
          <i :class="config.iconClass" />
        </div>
        <!-- Nom + stat -->
        <div>
          <div class="font-bold text-sm leading-tight" :class="isActive ? config.textClass : 'text-white/70'">
            {{ jauge.nom }}
          </div>
          <div class="text-xs text-white/40">{{ jauge.stat }}</div>
        </div>
      </div>

      <!-- Toggle button -->
      <button
        class="btn-toggle"
        :class="toggleClasses"
        :disabled="!isActive && isMaxReached"
        @click="$emit('toggle', jauge.id)"
        :aria-label="isActive ? `Désactiver ${jauge.nom}` : (isMaxReached ? 'Max 2 jauges actives' : `Activer ${jauge.nom}`)"
        :aria-pressed="isActive"
      >
        <i :class="isActive ? 'fa-solid fa-check' : 'fa-solid fa-power-off'" aria-hidden="true" />
      </button>
    </div>

    <!-- Barre valeur actuelle -->
    <div class="mb-2">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs text-white/50">Carburant actuel</span>
        <span class="text-sm font-bold" :class="config.textClass">
          {{ valeurFormatted }} / 100 000
        </span>
      </div>
      <div class="jauge-bar">
        <div
          class="jauge-bar-fill"
          :class="config.fillClass"
          :style="{ width: `${pourcentage}%` }"
        />
        <!-- Marqueurs de seuil -->
        <div class="absolute inset-0 flex pointer-events-none">
          <div class="h-full border-r border-white/20" style="width: 20%" />
          <div class="h-full border-r border-white/20" style="width: 20%" />
          <div class="h-full border-r border-white/20" style="width: 20%" />
          <div class="h-full border-r border-white/20" style="width: 20%" />
        </div>
      </div>
      <!-- Paliers -->
      <div class="flex gap-0.5 mt-2">
        <button
          v-for="palier in PALIERS"
          :key="palier.v"
          class="flex-1 rounded-lg py-1 text-xs font-bold transition-all duration-150 min-w-0 px-0"
          :class="etat.valeurActuelle === palier.v
            ? `${config.fillClass} text-white shadow-md`
            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'"
          :aria-label="`Carburant ${palier.l}`"
          @click="$emit('setValeur', jauge.id, palier.v)"
        >{{ palier.l }}</button>
      </div>
      <!-- Input exact -->
      <input
        type="number"
        min="0"
        max="100000"
        step="1000"
        :value="etat.valeurActuelle"
        :aria-label="`Carburant exact ${jauge.nom}`"
        @change="onValeurChange"
        class="w-full mt-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-center text-xs font-mono text-white/70 focus:outline-none focus:border-white/30 focus:text-white"
        placeholder="valeur exacte"
      />
    </div>

    <!-- Delta actuel -->
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs text-white/40">Delta / 10s :</span>
      <span class="badge-delta bg-white/10 text-white/80">
        <i class="fa-solid fa-bolt text-yellow-400 text-xs" aria-hidden="true" />
        ±{{ deltaActuel }}
      </span>
      <span class="text-xs text-white/30">×{{ nbMontures }} montures</span>
    </div>

    <!-- Objectif (affiché seulement si actif) -->
    <div v-if="isActive" class="border-t border-white/10 pt-3">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs text-white/50">Objectif stat monture</span>
        <span class="text-sm font-bold text-white/80">
          {{ objectifFormatted }} / 100 000
        </span>
      </div>
      <div class="jauge-bar">
        <div
          class="jauge-bar-fill bg-white/30"
          :style="{ width: `${pourcentageObjectif}%` }"
        />
        <div
          class="jauge-bar-fill absolute top-0 left-0"
          :class="config.fillClass"
          style="opacity: 0.4"
          :style="{ width: `${pourcentage}%` }"
        />
      </div>
      <input
        type="range"
        min="0"
        max="100000"
        step="1000"
        :value="etat.objectif"
        :aria-label="`Objectif stat ${jauge.nom}`"
        :aria-valuemin="0"
        :aria-valuemax="100000"
        :aria-valuenow="etat.objectif"
        @input="onObjectifInput"
        class="w-full mt-2"
        :style="{ accentColor: '#ffffff88' }"
      />
      <div class="flex items-center gap-2 mt-1">
        <button
          class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors flex items-center justify-center"
          :aria-label="`Diminuer objectif ${jauge.nom}`"
          @click="$emit('setObjectif', jauge.id, Math.max(0, etat.objectif - 5000))"
        >
          <i class="fa-solid fa-minus text-xs" aria-hidden="true" />
        </button>
        <input
          type="number"
          min="0"
          max="100000"
          step="1000"
          :value="etat.objectif"
          :aria-label="`Objectif stat ${jauge.nom}`"
          @change="onObjectifChange"
          class="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-center text-sm font-mono text-white focus:outline-none focus:border-white/30"
        />
        <button
          class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs transition-colors flex items-center justify-center"
          :aria-label="`Augmenter objectif ${jauge.nom}`"
          @click="$emit('setObjectif', jauge.id, Math.min(100000, etat.objectif + 5000))"
        >
          <i class="fa-solid fa-plus text-xs" aria-hidden="true" />
        </button>
        <button
          class="h-7 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors text-white/70 hover:text-white"
          :aria-label="`Mettre objectif ${jauge.nom} au maximum`"
          @click="$emit('setObjectif', jauge.id, 100000)"
        >
          MAX
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Jauge, JaugeState, JaugeId } from '@/types'
import { JAUGES_CONFIGS } from '@/composables/jaugesConfig'

const props = defineProps<{
  jauge: Jauge
  etat: JaugeState
  isActive: boolean
  isMaxReached: boolean
  nbMontures: number
  deltaActuel: number
}>()

const emit = defineEmits<{
  toggle: [id: JaugeId]
  setValeur: [id: JaugeId, val: number]
  setObjectif: [id: JaugeId, val: number]
}>()

const config = computed(() => JAUGES_CONFIGS[props.jauge.id])

const PALIERS = [
  { v: 0,      l: 'MIN'  },
  { v: 2000,   l: '2k'   },
  { v: 40000,  l: '40k'  },
  { v: 70000,  l: '70k'  },
  { v: 90000,  l: '90k'  },
  { v: 100000, l: 'MAX'  },
]

const pourcentage = computed(() => Math.round((props.etat.valeurActuelle / 100000) * 100))
const pourcentageObjectif = computed(() => Math.round((props.etat.objectif / 100000) * 100))
const valeurFormatted = computed(() => props.etat.valeurActuelle.toLocaleString('fr'))
const objectifFormatted = computed(() => props.etat.objectif.toLocaleString('fr'))

const toggleClasses = computed(() => {
  if (props.isActive) {
    return `active ${config.value.borderClass} ${config.value.textClass} bg-white/10`
  }
  if (props.isMaxReached) {
    return 'disabled-max border-white/20 text-white/30'
  }
  return 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
})

function onValeurChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v) && v >= 0 && v <= 100000) emit('setValeur', props.jauge.id, v)
}

function onObjectifInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v)) emit('setObjectif', props.jauge.id, v)
}

function onObjectifChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v) && v >= 0 && v <= 100000) emit('setObjectif', props.jauge.id, v)
}
</script>

<style scoped>
.jauge-bar {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.jauge-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.btn-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;
  flex-shrink: 0;
}

.btn-toggle.active {
  background: rgba(255, 255, 255, 0.1);
}

.btn-toggle.disabled-max {
  cursor: not-allowed;
}

.badge-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}
</style>
