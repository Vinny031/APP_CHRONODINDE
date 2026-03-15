<template>
  <div class="min-h-screen flex flex-col">
    <HeaderApp />

    <TimerBar
      :enclos-timers="enclosTimers"
      :format-temps="formatTemps"
      @demarrer="demarrerTimer"
      @pauser="pauserTimer"
      @annuler="annulerTimer"
    />

    <main class="flex-1 w-full max-w-5xl mx-auto px-3 py-4 sm:px-4 sm:py-5">
      <div class="flex flex-col lg:flex-row gap-4 lg:gap-5">

        <!-- Colonne principale : dashboard -->
        <div class="flex-1 min-w-0" ref="dashCol">
          <JaugesDashboard
            :jauges="JAUGES_DEF"
            :etats="etats"
            :jauges-actives="jaugesActives"
            :MAX_ACTIVES="MAX_ACTIVES"
:barre-height="barreHeight"
            :zone-width="zoneWidth"
            @toggle="toggleJauge"
            @set-valeur="setValeurActuelle"
            @set-objectif="setObjectif"
          />

          <!-- Sélecteur d'enclos -->
          <div class="mt-3 flex items-center gap-2">
            <span class="text-blue-300/60 text-xs font-semibold uppercase tracking-widest mr-1">Enclos</span>
            <div class="flex items-center gap-1">
              <button
                v-for="enc in enclos"
                :key="enc.id"
                type="button"
                class="w-8 h-8 rounded-lg text-sm font-bold transition-all duration-150 border"
                :class="enc.id === enclosActifId
                  ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-[0_0_6px_rgba(96,165,250,0.3)]'
                  : 'bg-blue-500/10 border-blue-400/20 text-blue-300/40 hover:border-blue-400/40 hover:text-blue-300/70'"
                @click="selectionnerEnclos(enc.id)"
              >
                {{ enc.id }}
              </button>
            </div>
          </div>

        </div>

        <!-- Panneau timer -->
        <div class="lg:w-72 xl:w-80 lg:sticky lg:top-20 lg:self-start">
          <TimerPanel
            :estimations="estimations"
            :etats="etats"
            :temps-total="tempsTotal"
            :timer-source="timerSource"
            :timer-state="timerState"
            :temps-restant="tempsRestant"
            :temps-secondaire-restant="tempsSecondaireRestant"
            :format-temps="formatTemps"
            @set-timer-source="setTimerSource"
            @set-objectif="setObjectif"
          />
        </div>

      </div>
    </main>

    <footer class="text-center py-3 text-xs border-t border-white/5" style="color:rgba(255,255,255,0.18)">
      Dofus Élevage Timer · Estimations théoriques
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import HeaderApp from '@/components/HeaderApp.vue'
import TimerBar from '@/components/TimerBar.vue'
import JaugesDashboard from '@/components/JaugesDashboard.vue'
import TimerPanel from '@/components/TimerPanel.vue'
import { useElevageTimer } from '@/composables/useElevageTimer'
import { JAUGES_DEF } from '@/composables/jaugesConfig'

const {
  enclos, enclosActifId, selectionnerEnclos,
  jaugesActives, etats, MAX_ACTIVES,
  toggleJauge, setValeurActuelle, setObjectif,
  estimations, tempsTotal, formatTemps,
  timerSource, timerState, tempsRestant, tempsSecondaireRestant,
  demarrerTimer, pauserTimer, annulerTimer, setTimerSource,
  enclosTimers,
} = useElevageTimer()



const dashCol    = ref<HTMLElement | null>(null)
const barreHeight = ref(260)
const zoneWidth   = ref(0)

// AXE_G=34 + padding carte=32 (2×16)
const FIXED_W = 34 + 32

function updateDimensions() {
  const h = window.innerHeight
  barreHeight.value = h < 600 ? 180 : h < 800 ? 220 : 260
  const colW = dashCol.value?.clientWidth ?? Math.min(window.innerWidth - 24, 640)
  zoneWidth.value = Math.max(0, colW - FIXED_W)
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function onResize() {
  if (resizeTimer !== null) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(updateDimensions, 150)
}

onMounted(() => {
  updateDimensions()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (resizeTimer !== null) clearTimeout(resizeTimer)
})
</script>
