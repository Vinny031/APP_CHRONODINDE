<template>
  <div class="card-dofus">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
        <img src="/icons/icon_timer.webp" class="w-8 h-8 object-contain" />
      </div>
      <div>
        <h2 class="font-bold text-lg text-white leading-tight">Estimation</h2>
        <p class="text-xs text-white/40">Basée sur la consommation réelle</p>
      </div>
    </div>

    <!-- Aucune jauge active -->
    <div v-if="estimations.length === 0" class="text-center py-6">
      <i class="fa-solid fa-toggle-off text-4xl text-white/20 mb-3 block" />
      <p class="text-white/40 text-sm">Activez 1 ou 2 jauges<br>pour voir l'estimation</p>
    </div>

    <!-- Cards côte à côte -->
    <div v-else :class="estimations.length === 2 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'">
      <button
        v-for="est in estimations"
        :key="est.jaugeId"
        type="button"
        class="text-left rounded-xl p-3 border transition-all duration-200"
        :class="[
          est.possible ? '' : 'border-red-500/30 bg-red-500/5',
          timerSource === est.jaugeId
            ? 'border-white/40 bg-white/8 ring-1 ring-white/20'
            : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/6',
        ]"
        @click="$emit('setTimerSource', est.jaugeId)"
      >
        <!-- Ligne 1 : icône + nom + temps -->
        <div class="flex items-center gap-1.5 mb-2">
          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200"
            :class="timerSource === est.jaugeId ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]' : 'bg-white/20'"
          />
          <i :class="[getJaugeIcon(est.jaugeId), getJaugeTextColor(est.jaugeId), 'text-xs flex-shrink-0']" />
          <span class="font-bold text-xs truncate" :class="getJaugeTextColor(est.jaugeId)">
            {{ getJaugeNom(est.jaugeId) }}
          </span>
        </div>
        <div class="mb-2">
          <span v-if="est.possible" class="font-bold text-base text-white">
            {{ formatTemps(tempsAffiché(est.jaugeId, est.tempsSecondes)) }}
          </span>
          <span v-else class="text-red-400 font-bold text-xs">
            <i class="fa-solid fa-triangle-exclamation" /> Impossible
          </span>
        </div>

        <!-- Ligne 2 : input objectif (stop propagation pour ne pas déclencher setTimerSource) -->
        <div class="mb-2" @click.stop>
          <div class="text-white/30 text-[10px] mb-0.5">Objectif stat</div>
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="0"
              :max="getJaugeType(est.jaugeId) === 'passive' ? 5000 : 20000"
              step="500"
              :value="etats[est.jaugeId].objectif"
              @change="e => { const el = e.target as HTMLInputElement; const v = parseInt(el.value, 10); if (!isNaN(v)) { $emit('setObjectif', est.jaugeId, v); el.value = String(etats[est.jaugeId].objectif) } }"
              class="flex-1 rounded-md px-1.5 py-1 font-mono text-white text-xs focus:outline-none"
              :style="{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }"
            />
            <button
              class="rounded-md px-1.5 py-1 text-[10px] font-bold text-white/60 hover:text-white transition-colors"
              :style="{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)' }"
              @click="$emit('setObjectif', est.jaugeId, getJaugeType(est.jaugeId) === 'passive' ? 5000 : 20000)"
            >MAX</button>
          </div>
        </div>

        <!-- Ligne 3 : carbu + cycles -->
        <div class="grid grid-cols-2 gap-1 text-[10px]">
          <div>
            <div class="text-white/30 mb-0.5">Carbu</div>
            <div class="font-mono text-white/60">{{ est.valeurDepart.toLocaleString('fr') }}</div>
          </div>
          <div>
            <div class="text-white/30 mb-0.5">Rythme</div>
            <div class="font-mono text-white/60">±{{ getDeltaForCarbu(est.valeurDepart) }}/10s</div>
          </div>
        </div>

        <!-- Message d'erreur -->
        <p v-if="est.message" class="text-red-400 text-[10px] mt-1.5 flex items-center gap-1">
          <i class="fa-solid fa-circle-info" />
          {{ est.message }}
        </p>
      </button>
    </div>

    <!-- Temps total (si 2 jauges) -->
    <div v-if="estimations.length === 2" class="flex items-center gap-2 px-1 pt-3 text-white/60 text-xs">
      <i class="fa-solid fa-hourglass-half" />
      <span>Temps total : {{ formatTemps(timerState !== 'idle' ? tempsRestant : tempsTotal) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EstimationResult, JaugeId, JaugeState } from '@/types'
import { JAUGES_CONFIGS, getDeltaForLevel, JAUGE_TYPES, JAUGES_DEF } from '@/composables/jaugesConfig'

const JAUGES_NOM = Object.fromEntries(JAUGES_DEF.map(j => [j.id, j.nom])) as Record<string, string>

const props = defineProps<{
  estimations: EstimationResult[]
  etats: Record<JaugeId, JaugeState>
  tempsTotal: number
  timerSource: JaugeId | null
  timerState: 'idle' | 'running' | 'paused'
  tempsRestant: number
  tempsSecondaireRestant: number | null
  formatTemps: (s: number) => string
}>()

function tempsAffiché(jaugeId: JaugeId, fallback: number): number {
  if (props.timerState === 'idle') return fallback
  // La jauge source = tempsRestant, l'autre = tempsSecondaireRestant
  if (jaugeId === props.timerSource) return props.tempsRestant
  return props.tempsSecondaireRestant ?? fallback
}

defineEmits<{
  setTimerSource: [source: JaugeId]
  setObjectif: [id: JaugeId, val: number]
}>()

function getDeltaForCarbu(valeur: number): number { return getDeltaForLevel(valeur) }

function getJaugeNom(id: JaugeId) { return JAUGES_NOM[id] }
function getJaugeIcon(id: JaugeId) { return JAUGES_CONFIGS[id].iconClass }
function getJaugeTextColor(id: JaugeId) { return JAUGES_CONFIGS[id].textClass }
function getJaugeType(id: JaugeId) { return JAUGE_TYPES[id] }
</script>
