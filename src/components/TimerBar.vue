<template>
  <div class="card-dofus">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <img src="/icons/icon_enclos.webp" alt="Enclos" class="w-12 h-12 object-contain" />
      </div>
      <div>
        <h2 class="font-bold text-lg text-white leading-tight">Enclos</h2>
        <p class="text-xs text-white/40">Sélectionnez un enclos</p>
      </div>
    </div>

    <!-- Cartes enclos : grid 3 cols mobile, 6 cols desktop -->
    <div class="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
        <div
          v-for="info in enclosTimers"
          :key="info.enclosId"
          class="relative rounded-xl border transition-all duration-200 flex flex-col items-start justify-center px-2 py-1.5 gap-0.5 cursor-pointer min-h-[44px]"
          :class="info.enclosId === enclosActifId
            ? 'bg-white/10 border-white/60'
            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'"
          @click="$emit('selectionner', info.enclosId)"
        >
          <!-- Œil suivi — positionné en absolu sur le coin haut droit de la carte -->
          <button
            class="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150 border"
            :class="info.enclosId === enclosSuiviId
              ? 'text-cyan-400 bg-[#1a1f35] border-cyan-400/60'
              : 'text-white/20 bg-[#1a1f35] border-white/10 hover:text-white/50'"
            :title="info.enclosId === enclosSuiviId ? 'Ne plus suivre' : 'Suivre dans le titre'"
            @click.stop="$emit('setSuivi', info.enclosId === enclosSuiviId ? null : info.enclosId)"
          ><i class="fa-solid fa-eye text-[9px]" /></button>

          <!-- Ligne numéro + bouton -->
          <div class="flex items-center justify-between w-full">
            <span
              class="text-xs font-bold leading-none w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              :class="info.enclosId === enclosActifId ? 'bg-white/20 text-white' : 'bg-white/10 text-white/30'"
            >{{ info.enclosId }}</span>

            <!-- Bouton contrôle -->
            <div class="w-5 h-5 flex items-center justify-center flex-shrink-0" @click.stop>
              <template v-if="info.activeCount > 0">
                <button
                  v-if="info.timerState !== 'running'"
                  @click="$emit('demarrer', info.enclosId)"
                  :disabled="info.tempsSource === 0"
                  class="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
                  :class="info.tempsSource === 0 ? 'opacity-20 cursor-not-allowed text-white/30' : 'text-white/60 hover:bg-white/10'"
                ><i class="fa-solid fa-play text-[10px]" /></button>
                <button
                  v-if="info.timerState === 'running'"
                  @click="$emit('pauser', info.enclosId)"
                  class="w-5 h-5 rounded flex items-center justify-center text-yellow-400 hover:bg-yellow-400/20 transition-all duration-150"
                ><i class="fa-solid fa-pause text-[10px]" /></button>
              </template>
            </div>
          </div>

          <!-- Timer -->
          <span
            class="font-mono tabular-nums text-xs font-semibold truncate w-full"
            :class="info.enclosId === enclosActifId
              ? (info.timerState !== 'idle' && info.tempsRestant === 0 && info.tempsSecondaire !== null && info.tempsSecondaire > 0 ? 'text-white/25' : 'text-white')
              : 'text-white/25'"
          >{{ info.activeCount > 0 ? formatTemps(info.timerState !== 'idle' ? info.tempsRestant : info.tempsSource) : '—' }}</span>
          <span
            class="font-mono tabular-nums text-[10px] truncate w-full"
            :class="info.tempsSecondaire !== null
              ? (info.enclosId === enclosActifId && info.timerState !== 'idle' && info.tempsRestant === 0 && info.tempsSecondaire > 0 ? 'text-white font-semibold' : 'text-white/25')
              : 'invisible'"
          >{{ info.tempsSecondaire !== null ? formatTemps(info.tempsSecondaire) : '—' }}</span>
        </div>
      </div>

  </div>
</template>

<script setup lang="ts">
import type { EnclosTimerInfo } from '@/composables/useElevageTimer'

defineProps<{
  enclosTimers: EnclosTimerInfo[]
  enclosActifId: number
  enclosSuiviId: number | null
  formatTemps: (s: number) => string
}>()

defineEmits<{
  demarrer: [enclosId: number]
  pauser: [enclosId: number]
  selectionner: [enclosId: number]
  setSuivi: [enclosId: number | null]
}>()
</script>
