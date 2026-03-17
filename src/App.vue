<template>
  <div class="min-h-screen flex flex-col">
    <HeaderApp />

    <!-- Bandeau d'erreur de stockage -->
    <div
      v-if="erreurStockage"
      role="alert"
      class="px-4 py-2 text-sm text-center"
      style="background: rgba(233,69,96,0.15); border-bottom: 1px solid rgba(233,69,96,0.4); color: #f87171;"
    >
      <i class="fa-solid fa-triangle-exclamation mr-2" />{{ erreurStockage }}
    </div>

    <main class="flex-1 w-full px-3 py-4 sm:px-4 sm:py-5">

      <div class="flex flex-col gap-4" ref="dashCol">
        <TimerBar
          :enclos-timers="enclosTimers"
          :enclos-actif-id="enclosActifId"
          :format-temps="formatTemps"
          @demarrer="demarrerTimer"
          @pauser="pauserTimer"
          @annuler="annulerTimer"
          @selectionner="selectionnerEnclos"
        />

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

        <!-- Panneau estimation (pleine largeur, horizontal) -->
        <TimerPanel
          :estimations="estimations"
          :etats="etats"
          :temps-total="tempsTotal"
          :timer-source="timerSource"
          :timer-state="timerState"
          :temps-restant="tempsRestant"
          :temps-secondaire-restant="tempsSecondaireRestant"
          :temps-par-jauge="tempsParJauge"
          :format-temps="formatTemps"
          @set-timer-source="setTimerSource"
          @set-objectif="setObjectif"
        />
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
import { initialiserNotifications } from '@/composables/useNotification'

const {
  enclos, enclosActifId, selectionnerEnclos,
  jaugesActives, etats, MAX_ACTIVES,
  toggleJauge, setValeurActuelle, setObjectif,
  estimations, tempsTotal, formatTemps,
  timerSource, timerState, tempsRestant, tempsSecondaireRestant, tempsParJauge,
  demarrerTimer, pauserTimer, annulerTimer, setTimerSource,
  enclosTimers,
  erreurStockage,
} = useElevageTimer()



onMounted(() => { initialiserNotifications() })

const dashCol    = ref<HTMLElement | null>(null)
const barreHeight = ref(260)
const zoneWidth   = ref(0)

// AXE_G=34 + padding carte=32 (2×16)
const FIXED_W = 34 + 32

function updateDimensions() {
  const h = window.innerHeight
  barreHeight.value = h < 600 ? 180 : h < 800 ? 220 : 260
  const colW = dashCol.value?.clientWidth ?? (window.innerWidth - 24)
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
