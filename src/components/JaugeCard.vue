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
          <div class="h-full border-r border-white/20" style="width: 40%" />
          <div class="h-full border-r border-white/20" style="width: 30%" />
          <div class="h-full border-r border-white/20" style="width: 20%" />
        </div>
      </div>
      <!-- Input slider -->
      <input
        type="range"
        min="0"
        max="100000"
        step="1000"
        :value="etat.valeurActuelle"
        :aria-label="`Carburant ${jauge.nom}`"
        :aria-valuemin="0"
        :aria-valuemax="100000"
        :aria-valuenow="etat.valeurActuelle"
        @input="onValeurInput"
        class="w-full mt-2"
        :style="{ accentColor: config.accentColor }"
      />
      <!-- Input numérique -->
      <div class="flex items-center gap-2 mt-1">
        <button
          class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors flex items-center justify-center"
          :aria-label="`Diminuer carburant ${jauge.nom}`"
          @click="$emit('setValeur', jauge.id, Math.max(0, etat.valeurActuelle - 5000))"
        >
          <i class="fa-solid fa-minus text-xs" aria-hidden="true" />
        </button>
        <input
          type="number"
          min="0"
          max="100000"
          step="1000"
          :value="etat.valeurActuelle"
          :aria-label="`Carburant ${jauge.nom}`"
          @change="onValeurChange"
          class="flex-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-center text-sm font-mono text-white focus:outline-none focus:border-white/30"
        />
        <button
          class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors flex items-center justify-center"
          :aria-label="`Augmenter carburant ${jauge.nom}`"
          @click="$emit('setValeur', jauge.id, Math.min(100000, etat.valeurActuelle + 5000))"
        >
          <i class="fa-solid fa-plus text-xs" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Delta actuel -->
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs text-white/40">Delta / 10s :</span>
      <span class="badge-delta bg-white/10 text-white/80">
        <i class="fa-solid fa-bolt text-yellow-400 text-xs" />
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

function onValeurInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v)) emit('setValeur', props.jauge.id, v)
}

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
