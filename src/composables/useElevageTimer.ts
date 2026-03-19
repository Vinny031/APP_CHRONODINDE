import { ref, watch, onUnmounted } from 'vue'
import type { JaugeId, EnclosState } from '@/types'
import { loadState, persistEnclos, persistEnclosActifId, persistTimers, loadTimers, clearTimers } from '@/composables/useStorage'
import type { PersistedTimerEntry } from '@/composables/useStorage'
import { getDeltaForLevel } from '@/composables/jaugesConfig'
import { useEnclosManagement } from '@/composables/useEnclosManagement'
import { useEstimation } from '@/composables/useEstimation'
import { useTimer } from '@/composables/useTimer'

// Valeur maximale du carburant (pour les helpers de pourcentage).
const CARBURANT_MAX = 100_000

// Délai de debounce pour la persistance d'un enclos (ms).
// Évite de sauvegarder à chaque frappe clavier ou tick timer.
const DEBOUNCE_ENCLOS_MS = 400

// Re-export du type pour les consommateurs existants.
export type { EnclosTimerInfo } from '@/composables/useTimer'

export function useElevageTimer() {
  // --- Gestion des enclos et jauges ---
  // Le callback est défini après l'initialisation du timer pour éviter une référence
  // circulaire à la déclaration. Le closure capture annulerTimerRef assigné juste après.
  let annulerTimerRef: (enclosId: number) => void = () => {}

  const enclosManagement = useEnclosManagement((enclosId) => {
    // Callback appelé quand la timerSource d'un enclos change hors de ses jaugesActives :
    // on annule le timer de cet enclos pour éviter un état incohérent.
    annulerTimerRef(enclosId)
  })

  const {
    enclos, enclosActifId, enclosActif,
    nbMontures, jaugesActives, etats, timerSource,
    MAX_ACTIVES,
    selectionnerEnclos, toggleJauge, setValeurActuelle, setObjectif,
  } = enclosManagement

  // --- Estimation ---
  const { estimations, tempsTotal, tempsSource } = useEstimation(enclosActif)

  // --- Timer ---
  const timer = useTimer(enclos, enclosActifId)
  annulerTimerRef = timer.annulerTimer

  const {
    timerState, tempsRestant, tempsSecondaireRestant, tempsParJauge, enclosTimers,
    demarrerTimer, pauserTimer, annulerTimer, cleanupAllIntervals, restaurerTimer,
  } = timer

  // Met à jour la source du timer d'un enclos sans toucher à l'état du timer.
  function setTimerSource(source: JaugeId, enclosId: number = enclosActifId.value) {
    const enc = enclos.value.find(e => e.id === enclosId)!
    enc.timerSource = source
    _saveEnclosNow(enc)
  }

  // Reset tempsRestant affiché si idle et estimation change.
  watch(tempsTotal, () => {
    const runtime = timer.getRuntime(enclosActifId.value)
    if (runtime.state === 'idle') runtime.tempsRestant = 0
  })

  // --- Persistance granulaire ---
  const erreurStockage = ref<string | null>(null)

  // Timers de debounce par enclosId
  const _debounceHandles: Record<number, ReturnType<typeof setTimeout>> = {}

  function _onStorageError() {
    erreurStockage.value = 'Impossible de sauvegarder les données. Vérifiez les permissions du navigateur.'
  }

  function _onStorageSuccess() {
    erreurStockage.value = null
  }

  // Sauvegarde immédiate d'un enclos (utilisé quand on veut garantir l'écriture, ex: setTimerSource)
  function _saveEnclosNow(enc: EnclosState) {
    if (_debounceHandles[enc.id] !== undefined) {
      clearTimeout(_debounceHandles[enc.id])
      delete _debounceHandles[enc.id]
    }
    persistEnclos(enc).then(_onStorageSuccess).catch(_onStorageError)
  }

  // Sauvegarde différée d'un enclos (debounce pour les mutations fréquentes)
  function _saveEnclosDebounced(enc: EnclosState) {
    if (_debounceHandles[enc.id] !== undefined) clearTimeout(_debounceHandles[enc.id])
    _debounceHandles[enc.id] = setTimeout(() => {
      delete _debounceHandles[enc.id]
      persistEnclos(enc).then(_onStorageSuccess).catch(_onStorageError)
    }, DEBOUNCE_ENCLOS_MS)
  }

  // Un watch par enclos — déclenché uniquement sur les champs de CET enclos.
  // Le flag `loaded` évite de sauvegarder lors de la restauration initiale depuis IndexedDB.
  let loaded = false
  const unwatchEnclos = [0, 1, 2, 3, 4, 5].map(i =>
    watch(
      () => enclos.value[i],
      (enc) => {
        if (loaded) _saveEnclosDebounced(enc)
      },
      { deep: true }
    )
  )

  const unwatchEnclosActifId = watch(enclosActifId, (id) => {
    if (loaded) persistEnclosActifId(id).then(_onStorageSuccess).catch(_onStorageError)
  })

  // --- Persistance des timers actifs (reprise après fermeture) ---

  function _saveRunningTimers() {
    const snapshot: Partial<Record<number, PersistedTimerEntry>> = {}
    for (const id of [1, 2, 3, 4, 5, 6]) {
      const runtime = timer.getRuntime(id)
      if (runtime.state === 'running' || runtime.state === 'paused') {
        const enc = enclos.value.find(e => e.id === id)
        snapshot[id] = {
          state: runtime.state,
          timerSource: enc?.timerSource ?? null,
          tempsRestant: runtime.tempsRestant,
          tempsSecondaireRestant: runtime.tempsSecondaireRestant,
          tempsParJauge: { ...runtime.tempsParJauge },
          snapshot: { ...runtime.snapshot },
          savedAt: Date.now(),
        }
      }
    }
    persistTimers(snapshot)
  }

  // Sauvegarder à chaque fois que la page est cachée (fermeture onglet, navigation, etc.)
  function _onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      _saveRunningTimers()
    }
  }

  // pagehide couvre les cas où visibilitychange ne se déclenche pas (ex: mobile)
  function _onPageHide() {
    _saveRunningTimers()
  }

  document.addEventListener('visibilitychange', _onVisibilityChange)
  window.addEventListener('pagehide', _onPageHide)

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', _onVisibilityChange)
    window.removeEventListener('pagehide', _onPageHide)
    // Vider les debounces en attente et écrire immédiatement les enclos modifiés
    for (const [id, handle] of Object.entries(_debounceHandles) as [string, ReturnType<typeof setTimeout>][]) {
      clearTimeout(handle)
      const enc = enclos.value.find(e => e.id === Number(id))
      if (enc) persistEnclos(enc).catch(() => {})
    }
    unwatchEnclos.forEach(unwatch => unwatch())
    unwatchEnclosActifId()
    cleanupAllIntervals()
  })

  loadState().then(saved => {
    erreurStockage.value = null
    if (saved?.enclos && saved.enclos.length > 0) {
      enclos.value = enclos.value.map(def => {
        const persisted = saved.enclos.find(e => e.id === def.id)
        return persisted ? { ...def, ...persisted, timerSource: null } : def
      })
      enclosActifId.value = saved.enclosActifId ?? saved.enclos[0].id
    }

    // Restaurer les timers qui tournaient avant la fermeture (localStorage, synchrone)
    const savedTimers = loadTimers()
    if (savedTimers) {
      for (const [idStr, entry] of Object.entries(savedTimers)) {
        if (entry) restaurerTimer(Number(idStr), entry)
      }
      clearTimers()
    }
  }).catch((err) => {
    console.error('[load] erreur', err)
    erreurStockage.value = 'Impossible de charger les données sauvegardées. Les données de cette session ne seront pas persistées.'
  }).finally(() => {
    // Activer la persistance seulement après le chargement initial
    loaded = true
  })

  // --- Helpers ---
  function formatTemps(secondes: number): string {
    if (secondes === 0) return '0s'
    const h = Math.floor(secondes / 3600)
    const m = Math.floor((secondes % 3600) / 60)
    const s = secondes % 60
    const parts: string[] = []
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    if (s > 0 || parts.length === 0) parts.push(`${s}s`)
    return parts.join(' ')
  }

  function getPourcentage(id: JaugeId): number {
    return Math.round((enclosActif.value.etats[id].valeurActuelle / CARBURANT_MAX) * 100)
  }

  function getPourcentageObjectif(id: JaugeId): number {
    return Math.round((enclosActif.value.etats[id].objectif / CARBURANT_MAX) * 100)
  }

  function getDeltaActuel(id: JaugeId): number {
    return getDeltaForLevel(enclosActif.value.etats[id].valeurActuelle)
  }

  return {
    enclos, enclosActifId, enclosActif, selectionnerEnclos,
    nbMontures, jaugesActives, etats, MAX_ACTIVES,
    toggleJauge, setValeurActuelle, setObjectif,
    estimations, tempsTotal, formatTemps,
    getPourcentage, getPourcentageObjectif, getDeltaActuel,
    timerState, timerSource, tempsSource, tempsRestant, tempsSecondaireRestant, tempsParJauge,
    demarrerTimer, pauserTimer, setTimerSource,
    enclosTimers,
    erreurStockage,
  }
}
