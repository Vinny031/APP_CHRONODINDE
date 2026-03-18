import { reactive, computed } from 'vue'
import type { Ref } from 'vue'
import type { JaugeId, EnclosState } from '@/types'
import { estimerJaugePourEnclos, tempsSourcePourEnclos } from '@/composables/useEstimation'
import { getDeltaForLevel } from '@/composables/jaugesConfig'
import { notifierFinTimer, notifierObjectifAtteint } from '@/composables/useNotification'

// Durée d'un cycle de jeu en secondes.
const DUREE_CYCLE_SECONDES = 10

// État runtime du timer pour un enclos (non persisté)
export interface TimerRuntime {
  state: 'idle' | 'running' | 'paused'
  tempsRestant: number
  tempsSecondaireRestant: number | null
  tempsParJauge: Partial<Record<JaugeId, number>>
  intervalId: ReturnType<typeof setInterval> | null
  // Snapshot des objectifs et carbu au démarrage pour restauration à l'annulation
  snapshot: Partial<Record<JaugeId, { objectif: number; valeurActuelle: number }>>
}

export interface EnclosTimerInfo {
  enclosId: number
  timerState: 'idle' | 'running' | 'paused'
  tempsRestant: number
  tempsSource: number
  tempsSecondaire: number | null
  activeCount: number
  timerSource: JaugeId | null
}

export function useTimer(enclos: Ref<EnclosState[]>, enclosActifId: Ref<number>) {
  const timersRuntime = reactive<Record<number, TimerRuntime>>(
    Object.fromEntries([1, 2, 3, 4, 5, 6].map(id => [id, {
      state: 'idle',
      tempsRestant: 0,
      tempsSecondaireRestant: null,
      tempsParJauge: {},
      intervalId: null,
      snapshot: {},
    }]))
  )

  function getRuntime(enclosId: number): TimerRuntime {
    return timersRuntime[enclosId]
  }

  function annulerTimer(enclosId: number) {
    const runtime = getRuntime(enclosId)
    if (runtime.intervalId !== null) {
      clearInterval(runtime.intervalId)
      runtime.intervalId = null
    }
    runtime.state = 'idle'
    runtime.tempsRestant = 0
    runtime.tempsSecondaireRestant = null
    runtime.tempsParJauge = {}
    // Restaurer objectifs et carbu initiaux
    const enc = enclos.value.find(e => e.id === enclosId)
    if (enc) {
      for (const [id, snap] of Object.entries(runtime.snapshot) as [JaugeId, { objectif: number; valeurActuelle: number }][]) {
        enc.etats[id].objectif = snap.objectif
        enc.etats[id].valeurActuelle = snap.valeurActuelle
      }
    }
    runtime.snapshot = {}
  }

  function demarrerTimer(enclosId: number = enclosActifId.value) {
    const runtime = getRuntime(enclosId)
    const enc = enclos.value.find(e => e.id === enclosId)!
    if (runtime.state === 'running') return
    if (runtime.state === 'idle') {
      // Snapshot des valeurs initiales
      runtime.snapshot = {}
      runtime.tempsParJauge = {}
      for (const id of enc.jaugesActives) {
        runtime.snapshot[id] = { objectif: enc.etats[id].objectif, valeurActuelle: enc.etats[id].valeurActuelle }
        runtime.tempsParJauge[id] = estimerJaugePourEnclos(enc, id).tempsSecondes
      }
      const tempsMax = Math.max(...enc.jaugesActives.map(id => runtime.tempsParJauge[id] ?? 0))
      runtime.tempsRestant = tempsMax > 0 ? tempsMax : tempsSourcePourEnclos(enc)
      // Timer secondaire = l'autre jauge active
      const src = enc.timerSource && enc.jaugesActives.includes(enc.timerSource) ? enc.timerSource : null
      const jaugeSecondaire = enc.jaugesActives.find(id => id !== src) ?? null
      runtime.tempsSecondaireRestant = jaugeSecondaire ? (runtime.tempsParJauge[jaugeSecondaire] ?? null) : null
    }
    if (runtime.tempsRestant <= 0) return
    runtime.state = 'running'
    runtime.intervalId = setInterval(() => {
      if (runtime.tempsRestant <= 1) {
        // Forcer objectif à 0 pour toutes les jauges actives (le timer représente le temps exact pour les atteindre)
        for (const id of enc.jaugesActives) {
          enc.etats[id].objectif = 0
        }
        runtime.tempsRestant = 0
        runtime.tempsSecondaireRestant = null
        runtime.tempsParJauge = {}
        runtime.state = 'idle'
        runtime.snapshot = {}
        if (runtime.intervalId !== null) { clearInterval(runtime.intervalId); runtime.intervalId = null }
        notifierFinTimer(enclosId)
      } else {
        runtime.tempsRestant--
        // Décrémenter chaque jauge indépendamment
        for (const id of enc.jaugesActives) {
          const t = runtime.tempsParJauge[id]
          if (t !== undefined && t > 0) {
            runtime.tempsParJauge = { ...runtime.tempsParJauge, [id]: t - 1 }
          }
        }
        if (runtime.tempsSecondaireRestant !== null && runtime.tempsSecondaireRestant > 0) runtime.tempsSecondaireRestant--
        if (runtime.tempsRestant % DUREE_CYCLE_SECONDES === 0) {
          for (const id of enc.jaugesActives) {
            const etat = enc.etats[id]
            if (etat.objectif <= 0) continue
            const delta = getDeltaForLevel(etat.valeurActuelle)
            if (delta === 0) continue
            const objectifAvant = etat.objectif
            const consomme = Math.min(delta, etat.valeurActuelle)
            etat.valeurActuelle = Math.max(0, etat.valeurActuelle - delta * enc.nbMontures)
            etat.objectif = Math.max(0, etat.objectif - consomme)
            if (objectifAvant > 0 && etat.objectif <= 0) notifierObjectifAtteint(enclosId, id)
          }
        }
      }
    }, 1000)
  }

  function pauserTimer(enclosId: number = enclosActifId.value) {
    const runtime = getRuntime(enclosId)
    if (runtime.state !== 'running') return
    if (runtime.intervalId !== null) { clearInterval(runtime.intervalId); runtime.intervalId = null }
    runtime.state = 'paused'
  }

  // Annule le timer si nécessaire avant de changer la source.
  // La mise à jour de enc.timerSource est gérée par l'appelant.
  function setTimerSource(enclosId: number = enclosActifId.value) {
    const runtime = getRuntime(enclosId)
    if (runtime.state !== 'idle') annulerTimer(enclosId)
  }

  const timerState = computed(() => getRuntime(enclosActifId.value).state)
  const tempsRestant = computed(() => getRuntime(enclosActifId.value).tempsRestant)
  const tempsParJauge = computed(() => getRuntime(enclosActifId.value).tempsParJauge)
  const tempsSecondaireRestant = computed(() => {
    const enc = enclos.value.find(e => e.id === enclosActifId.value)
    if (!enc || enc.jaugesActives.length < 2) return null
    return getRuntime(enclosActifId.value).tempsSecondaireRestant
  })

  const enclosTimers = computed<EnclosTimerInfo[]>(() =>
    enclos.value.map(enc => {
      const runtime = getRuntime(enc.id)
      const src = enc.timerSource && enc.jaugesActives.includes(enc.timerSource) ? enc.timerSource : enc.jaugesActives[0] ?? null
      const jaugeSecondaire = enc.jaugesActives.find(id => id !== src) ?? null
      const tempsAffiche = runtime.state !== 'idle' && src
        ? (runtime.tempsParJauge[src] ?? 0)
        : tempsSourcePourEnclos(enc)
      const tempsSecondaireAffiche = jaugeSecondaire
        ? (runtime.state !== 'idle' ? (runtime.tempsParJauge[jaugeSecondaire] ?? null) : estimerJaugePourEnclos(enc, jaugeSecondaire).tempsSecondes)
        : null
      return {
        enclosId: enc.id,
        timerState: runtime.state,
        tempsRestant: tempsAffiche,
        tempsSource: tempsSourcePourEnclos(enc),
        tempsSecondaire: enc.jaugesActives.length >= 2 ? tempsSecondaireAffiche : null,
        activeCount: enc.jaugesActives.length,
        timerSource: enc.timerSource,
      }
    })
  )

  function cleanupAllIntervals() {
    for (const runtime of Object.values(timersRuntime)) {
      if (runtime.intervalId !== null) {
        clearInterval(runtime.intervalId)
        runtime.intervalId = null
      }
    }
  }

  return {
    timersRuntime, getRuntime,
    timerState, tempsRestant, tempsSecondaireRestant, tempsParJauge, enclosTimers,
    demarrerTimer, pauserTimer, annulerTimer, setTimerSource,
    cleanupAllIntervals,
  }
}
