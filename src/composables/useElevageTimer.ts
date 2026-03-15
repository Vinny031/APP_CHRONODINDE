import { ref, computed, reactive, watch, onUnmounted } from 'vue'
import type { JaugeId, JaugeState, EstimationResult, EnclosState } from '@/types'
import { loadState, saveState, defaultEnclos } from '@/composables/useStorage'
import { getDeltaForLevel } from '@/composables/jaugesConfig'


const MAX_ACTIVES = 2
const PASSIFS_LIES: JaugeId[] = ['baffeur', 'caresseur']

// État runtime du timer pour un enclos (non persisté)
interface TimerRuntime {
  state: 'idle' | 'running' | 'paused'
  tempsRestant: number
  tempsSecondaireRestant: number | null
  intervalId: ReturnType<typeof setInterval> | null
  // Snapshot des objectifs et carbu au démarrage pour restauration à l'annulation
  snapshot: Partial<Record<JaugeId, { objectif: number; valeurActuelle: number }>>
}

export interface EnclosTimerInfo {
  enclosId: number
  timerState: 'idle' | 'running' | 'paused'
  tempsRestant: number
  tempsSource: number
  tempsSecondaire: number | null  // temps de la jauge non-sélectionnée, recalculé en live
  activeCount: number
  timerSource: JaugeId | null
}

export function useElevageTimer() {
  // --- Enclos ---
  const enclos = ref<EnclosState[]>([1,2,3,4,5,6].map(defaultEnclos))
  const enclosActifId = ref<number>(1)

  const enclosActif = computed<EnclosState>(() => {
    return enclos.value.find(e => e.id === enclosActifId.value) ?? enclos.value[0]
  })

  // --- Runtime timer par enclos (non persisté) ---
  const timersRuntime = reactive<Record<number, TimerRuntime>>(
    Object.fromEntries([1,2,3,4,5,6].map(id => [id, { state: 'idle', tempsRestant: 0, tempsSecondaireRestant: null, intervalId: null, snapshot: {} }]))
  )

  function _runtime(enclosId: number): TimerRuntime {
    return timersRuntime[enclosId]
  }

  // Raccourcis vers l'état de l'enclos actif (réactifs via computed)
  const nbMontures = computed({
    get: () => enclosActif.value.nbMontures,
    set: (v: number) => { enclosActif.value.nbMontures = v; _snapshot() },
  })

  const jaugesActives = computed<JaugeId[]>(() => enclosActif.value.jaugesActives)
  const etats = computed<Record<JaugeId, JaugeState>>(() => enclosActif.value.etats)

  const timerSource = computed({
    get: () => enclosActif.value.timerSource,
    set: (v: JaugeId | null) => { enclosActif.value.timerSource = v; _snapshot() },
  })

  // --- Gestion des enclos ---
  function selectionnerEnclos(id: number) {
    enclosActifId.value = id
  }

  // --- Jauges ---
  function toggleJauge(id: JaugeId) {
    const enc = enclosActif.value
    const etat = enc.etats[id]
    if (etat.enabled) {
      etat.enabled = false
      enc.jaugesActives = enc.jaugesActives.filter(j => j !== id)
    } else {
      if (PASSIFS_LIES.includes(id)) {
        const autre = PASSIFS_LIES.find(j => j !== id)!
        if (enc.etats[autre].enabled) {
          enc.etats[autre].enabled = false
          enc.jaugesActives = enc.jaugesActives.filter(j => j !== autre)
        }
      }
      if (enc.jaugesActives.length >= MAX_ACTIVES) {
        const evictedId = enc.jaugesActives[enc.jaugesActives.length - 1]
        enc.etats[evictedId].enabled = false
        enc.jaugesActives = [...enc.jaugesActives.slice(0, -1), id]
      } else {
        enc.jaugesActives.push(id)
      }
      etat.enabled = true
    }
    // Sync timerSource
    if (enc.timerSource === null && enc.jaugesActives.length > 0) {
      enc.timerSource = enc.jaugesActives[0]
    } else if (enc.timerSource !== null && !enc.jaugesActives.includes(enc.timerSource)) {
      const rt = _runtime(enc.id)
      if (rt.state !== 'idle') _annulerTimer(enc.id)
      enc.timerSource = enc.jaugesActives[0] ?? null
    }
    _snapshot()
  }

  function setValeurActuelle(id: JaugeId, val: number) {
    enclosActif.value.etats[id].valeurActuelle = Math.max(0, Math.min(100000, val))
    _snapshot()
  }

  function setObjectif(id: JaugeId, val: number) {
    if (PASSIFS_LIES.includes(id)) {
      enclosActif.value.etats[id].objectif = Math.max(0, Math.min(5000, val))
    } else {
      enclosActif.value.etats[id].objectif = Math.max(0, Math.min(20000, val))
    }
    _snapshot()
  }

  // --- Estimations ---
  function _estimerJaugePourEnclos(enc: EnclosState, id: JaugeId): EstimationResult {
    const { valeurActuelle, objectif } = enc.etats[id]

    if (objectif <= 0) {
      return { jaugeId: id, valeurDepart: valeurActuelle, objectif, tempsSecondes: 0, nbCycles: 0, possible: true }
    }

    let carburant = valeurActuelle
    let statManquante = objectif
    let cycles = 0
    const maxCycles = 1_000_000

    while (statManquante > 0 && carburant > 0 && cycles < maxCycles) {
      const delta = getDeltaForLevel(carburant)
      if (delta === 0) break
      carburant = Math.max(0, carburant - delta * enc.nbMontures)
      statManquante = Math.max(0, statManquante - delta)
      cycles++
    }

    const possible = statManquante <= 0
    const tempsSecondes = cycles * 10

    return {
      jaugeId: id,
      valeurDepart: valeurActuelle,
      objectif,
      tempsSecondes,
      nbCycles: cycles,
      possible,
      message: !possible ? `Carburant insuffisant (manque ${statManquante.toLocaleString('fr')} pts)` : undefined,
    }
  }

  const estimations = computed<EstimationResult[]>(() => {
    return enclosActif.value.jaugesActives.map(id => _estimerJaugePourEnclos(enclosActif.value, id))
  })

  const tempsTotal = computed(() => {
    if (estimations.value.length === 0) return 0
    return Math.max(...estimations.value.map(e => e.tempsSecondes))
  })

  // Temps source = jauge sélectionnée, sinon max
  function _tempsSourcePourEnclos(enc: EnclosState): number {
    if (enc.jaugesActives.length === 0) return 0
    const src = enc.timerSource && enc.jaugesActives.includes(enc.timerSource) ? enc.timerSource : null
    if (src) return _estimerJaugePourEnclos(enc, src).tempsSecondes
    return Math.max(...enc.jaugesActives.map(id => _estimerJaugePourEnclos(enc, id).tempsSecondes))
  }

  // --- Timer par enclos ---
  function _annulerTimer(enclosId: number) {
    const rt = _runtime(enclosId)
    if (rt.intervalId !== null) {
      clearInterval(rt.intervalId)
      rt.intervalId = null
    }
    rt.state = 'idle'
    rt.tempsRestant = 0
    rt.tempsSecondaireRestant = null
    // Restaurer objectifs et carbu initiaux
    const enc = enclos.value.find(e => e.id === enclosId)
    if (enc) {
      for (const [id, snap] of Object.entries(rt.snapshot) as [JaugeId, { objectif: number; valeurActuelle: number }][]) {
        enc.etats[id].objectif = snap.objectif
        enc.etats[id].valeurActuelle = snap.valeurActuelle
      }
    }
    rt.snapshot = {}
  }

  function demarrerTimer(enclosId: number = enclosActifId.value) {
    const rt = _runtime(enclosId)
    const enc = enclos.value.find(e => e.id === enclosId)!
    if (rt.state === 'running') return
    if (rt.state === 'idle') {
      // Snapshot des valeurs initiales
      rt.snapshot = {}
      for (const id of enc.jaugesActives) {
        rt.snapshot[id] = { objectif: enc.etats[id].objectif, valeurActuelle: enc.etats[id].valeurActuelle }
      }
      rt.tempsRestant = _tempsSourcePourEnclos(enc)
      // Timer secondaire = l'autre jauge active
      const src = enc.timerSource && enc.jaugesActives.includes(enc.timerSource) ? enc.timerSource : null
      const jaugeSecondaire = enc.jaugesActives.find(id => id !== src) ?? null
      rt.tempsSecondaireRestant = jaugeSecondaire ? _estimerJaugePourEnclos(enc, jaugeSecondaire).tempsSecondes : null
    }
    if (rt.tempsRestant <= 0) return
    rt.state = 'running'
    rt.intervalId = setInterval(() => {
      if (rt.tempsRestant <= 1) {
        rt.tempsRestant = 0
        rt.tempsSecondaireRestant = null
        rt.state = 'idle'
        rt.snapshot = {}
        if (rt.intervalId !== null) { clearInterval(rt.intervalId); rt.intervalId = null }
      } else {
        rt.tempsRestant--
        if (rt.tempsSecondaireRestant !== null && rt.tempsSecondaireRestant > 0) rt.tempsSecondaireRestant--
        if (rt.tempsRestant % 10 === 0) {
          for (const id of enc.jaugesActives) {
            const etat = enc.etats[id]
            if (etat.objectif <= 0) continue
            const delta = getDeltaForLevel(etat.valeurActuelle)
            if (delta === 0) continue
            etat.valeurActuelle = Math.max(0, etat.valeurActuelle - delta * enc.nbMontures)
            etat.objectif = Math.max(0, etat.objectif - delta)
          }
        }
      }
    }, 1000)
  }

  function pauserTimer(enclosId: number = enclosActifId.value) {
    const rt = _runtime(enclosId)
    if (rt.state !== 'running') return
    if (rt.intervalId !== null) { clearInterval(rt.intervalId); rt.intervalId = null }
    rt.state = 'paused'
  }

  function annulerTimer(enclosId: number = enclosActifId.value) {
    _annulerTimer(enclosId)
  }

  function setTimerSource(source: JaugeId, enclosId: number = enclosActifId.value) {
    const rt = _runtime(enclosId)
    if (rt.state !== 'idle') _annulerTimer(enclosId)
    const enc = enclos.value.find(e => e.id === enclosId)!
    enc.timerSource = source
    _snapshot()
  }

  // Compat enclos actif
  const timerState = computed(() => _runtime(enclosActifId.value).state)
  const tempsRestant = computed(() => _runtime(enclosActifId.value).tempsRestant)
  const tempsSecondaireRestant = computed(() =>
    enclosActif.value.jaugesActives.length >= 2 ? _runtime(enclosActifId.value).tempsSecondaireRestant : null
  )
  const tempsSource = computed(() => _tempsSourcePourEnclos(enclosActif.value))

  // Infos timer pour tous les enclos (pour la TimerBar)
  const enclosTimers = computed<EnclosTimerInfo[]>(() => {
    return enclos.value.map(enc => {
      const rt = _runtime(enc.id)
      return {
        enclosId: enc.id,
        timerState: rt.state,
        tempsRestant: rt.tempsRestant,
        tempsSource: _tempsSourcePourEnclos(enc),
        tempsSecondaire: enc.jaugesActives.length >= 2 ? rt.tempsSecondaireRestant : null,
        activeCount: enc.jaugesActives.length,
        timerSource: enc.timerSource,
      }
    })
  })

  // Reset tempsRestant affiché si idle et estimation change
  watch(tempsTotal, () => {
    const rt = _runtime(enclosActifId.value)
    if (rt.state === 'idle') rt.tempsRestant = 0
  })

  // --- Persistance ---
  function _snapshot() {
    saveState({
      enclos: JSON.parse(JSON.stringify(enclos.value)),
      enclosActifId: enclosActifId.value,
    })
  }

  const unwatchEnclos = watch(enclos, _snapshot, { deep: true })
  const unwatchEnclosActifId = watch(enclosActifId, _snapshot)

  onUnmounted(() => {
    unwatchEnclos()
    unwatchEnclosActifId()
    // Cleanup tous les intervals actifs
    for (const rt of Object.values(timersRuntime)) {
      if (rt.intervalId !== null) {
        clearInterval(rt.intervalId)
        rt.intervalId = null
      }
    }
  })

  loadState().then(saved => {
    if (!saved) return
    if (saved.enclos && saved.enclos.length > 0) {
      enclos.value = saved.enclos
      enclosActifId.value = saved.enclosActifId ?? saved.enclos[0].id
    }
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
    return Math.round((enclosActif.value.etats[id].valeurActuelle / 100000) * 100)
  }

  function getPourcentageObjectif(id: JaugeId): number {
    return Math.round((enclosActif.value.etats[id].objectif / 100000) * 100)
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
    timerState, timerSource, tempsSource, tempsRestant, tempsSecondaireRestant,
    demarrerTimer, pauserTimer, annulerTimer, setTimerSource,
    enclosTimers,
  }

}
