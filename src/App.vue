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
      <i class="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />{{ erreurStockage }}
    </div>

    <main class="flex-1 w-full px-3 py-4 sm:px-4 sm:py-5">

      <div class="flex flex-col gap-4" ref="dashCol">
        <TimerBar
          :enclos-timers="enclosTimers"
          :enclos-actif-id="enclosActifId"
          :enclos-suivi-id="enclosSuiviId"
          :format-temps="formatTemps"
          @demarrer="demarrerTimer"
          @pauser="pauserTimer"
          @selectionner="selectionnerEnclos"
          @set-suivi="enclosSuiviId = $event"
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

  <!-- Modal auth (portée globale via Teleport interne) -->
  <AuthModal v-if="showAuthModal" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue'
import HeaderApp from '@/components/HeaderApp.vue'
import TimerBar from '@/components/TimerBar.vue'
import JaugesDashboard from '@/components/JaugesDashboard.vue'
import TimerPanel from '@/components/TimerPanel.vue'
import AuthModal from '@/components/auth/AuthModal.vue'
import { useElevageTimer } from '@/composables/useElevageTimer'
import { JAUGES_DEF } from '@/composables/jaugesConfig'
import { initialiserNotifications } from '@/composables/useNotification'
import { useAuth } from '@/composables/useAuth'

const { showAuthModal } = useAuth()

const {
  enclos, enclosActifId, selectionnerEnclos,
  jaugesActives, etats, MAX_ACTIVES,
  toggleJauge, setValeurActuelle, setObjectif,
  estimations, tempsTotal, formatTemps,
  timerSource, timerState, tempsRestant, tempsSecondaireRestant, tempsParJauge,
  demarrerTimer, pauserTimer, setTimerSource,
  enclosTimers,
  erreurStockage,
} = useElevageTimer()



onMounted(() => { initialiserNotifications() })

const enclosSuiviId = ref<number | null>(null)

watchEffect(() => {
  if (enclosSuiviId.value === null) { document.title = 'ChronoDinde'; return }
  const info = enclosTimers.value.find(e => e.enclosId === enclosSuiviId.value)
  if (!info || info.activeCount === 0) { document.title = 'ChronoDinde'; return }
  // Timer actif = secondaire si principal à 0, sinon principal
  const timerActif = info.timerState !== 'idle' && info.tempsRestant === 0 && info.tempsSecondaire !== null && info.tempsSecondaire > 0
    ? info.tempsSecondaire
    : (info.timerState !== 'idle' ? info.tempsRestant : info.tempsSource)
  document.title = `ChronoDinde — ⏱ ${formatTemps(timerActif)}`
})

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

let ro: ResizeObserver | null = null

onMounted(() => {
  updateDimensions()
  ro = new ResizeObserver(updateDimensions)
  ro.observe(document.documentElement)
})
onUnmounted(() => {
  ro?.disconnect()
})
</script>
