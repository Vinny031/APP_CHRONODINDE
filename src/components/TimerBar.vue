<template>
  <div class="w-full border-b border-white/10" style="background: rgba(26,26,46,0.92); backdrop-filter: blur(12px);">
    <div class="max-w-5xl mx-auto px-3 py-2">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        <div
          v-for="info in enclosTimers"
          :key="info.enclosId"
          class="relative rounded-lg border transition-all duration-200 h-12 flex items-center px-2 gap-2"
          :class="info.activeCount > 0
            ? 'bg-blue-500/20 border-blue-400/60 shadow-[0_0_6px_rgba(96,165,250,0.3)]'
            : 'bg-white/[0.02] border-white/[0.06]'"
        >
          <!-- Badge numéro -->
          <span
            class="text-[10px] font-bold leading-none flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
            :class="info.activeCount > 0
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-white/10 text-white/25'"
          >{{ info.enclosId }}</span>

          <!-- Zone timers -->
          <div class="flex-1 min-w-0 flex flex-col justify-center leading-none">
            <!-- Timer principal -->
            <span
              class="font-mono tabular-nums text-sm font-semibold truncate"
              :class="info.activeCount > 0 ? 'text-blue-200' : 'text-white/20'"
            >{{ info.activeCount > 0 ? formatTemps(info.timerState !== 'idle' ? info.tempsRestant : info.tempsSource) : '—' }}</span>

            <!-- Timer secondaire = autre jauge active, décompte en live -->
            <span
              v-if="info.tempsSecondaire !== null"
              class="font-mono tabular-nums text-xs truncate mt-0.5 text-blue-300/40"
            >{{ formatTemps(info.tempsSecondaire) }}</span>
          </div>

          <!-- Boutons contrôle -->
          <div v-if="info.activeCount > 0" class="flex items-center gap-0 flex-shrink-0">
            <!-- Play -->
            <button
              v-if="info.timerState !== 'running'"
              @click="$emit('demarrer', info.enclosId)"
              :disabled="info.tempsSource === 0"
              :aria-label="`Démarrer enclos ${info.enclosId}`"
              class="w-6 h-6 rounded flex items-center justify-center transition-all duration-150"
              :class="info.tempsSource === 0
                ? 'opacity-20 cursor-not-allowed text-white/30'
                : 'text-[#e94560] hover:bg-[#e94560]/20'"
            >
              <i class="fa-solid fa-play text-[9px]" aria-hidden="true" />
            </button>

            <!-- Pause -->
            <button
              v-if="info.timerState === 'running'"
              @click="$emit('pauser', info.enclosId)"
              :aria-label="`Mettre en pause enclos ${info.enclosId}`"
              class="w-6 h-6 rounded flex items-center justify-center text-yellow-400 hover:bg-yellow-400/20 transition-all duration-150"
            >
              <i class="fa-solid fa-pause text-[9px]" aria-hidden="true" />
            </button>

            <!-- Stop -->
            <button
              v-if="info.timerState !== 'idle'"
              @click="$emit('annuler', info.enclosId)"
              :aria-label="`Annuler enclos ${info.enclosId}`"
              class="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/10 transition-all duration-150"
            >
              <i class="fa-solid fa-stop text-[9px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnclosTimerInfo } from '@/composables/useElevageTimer'

defineProps<{
  enclosTimers: EnclosTimerInfo[]
  formatTemps: (s: number) => string
}>()

defineEmits<{
  demarrer: [enclosId: number]
  pauser: [enclosId: number]
  annuler: [enclosId: number]
}>()
</script>
