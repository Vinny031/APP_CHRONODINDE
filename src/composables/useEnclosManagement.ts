import { ref, computed } from 'vue'
import type { JaugeId, EnclosState } from '@/types'
import { defaultEnclos } from '@/composables/useStorage'

const MAX_ACTIVES = 2
const PASSIFS_LIES: JaugeId[] = ['baffeur', 'caresseur']

// Objectif stat maximum pour les jauges passives (baffeur/caresseur).
const OBJECTIF_MAX_PASSIVE = 5_000
// Objectif stat maximum pour les jauges actives.
const OBJECTIF_MAX_ACTIVE = 20_000
// Valeur maximale du carburant d'une jauge.
const CARBURANT_MAX = 100_000

export function useEnclosManagement(onTimerSourceChange: (enclosId: number) => void) {
  const enclos = ref<EnclosState[]>([1, 2, 3, 4, 5, 6].map(defaultEnclos))
  const enclosActifId = ref<number>(1)

  const enclosActif = computed<EnclosState>(() =>
    enclos.value.find(e => e.id === enclosActifId.value) ?? enclos.value[0]
  )

  function selectionnerEnclos(id: number) {
    enclosActifId.value = id
  }

  const nbMontures = computed({
    get: () => enclosActif.value.nbMontures,
    set: (v: number) => { enclosActif.value.nbMontures = v },
  })

  const jaugesActives = computed<JaugeId[]>(() => enclosActif.value.jaugesActives)
  const etats = computed(() => enclosActif.value.etats)

  const timerSource = computed({
    get: () => enclosActif.value.timerSource,
    set: (v: JaugeId | null) => { enclosActif.value.timerSource = v },
  })

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
      onTimerSourceChange(enc.id)
      enc.timerSource = enc.jaugesActives[0] ?? null
    }
  }

  function setValeurActuelle(id: JaugeId, val: number) {
    enclosActif.value.etats[id].valeurActuelle = Math.max(0, Math.min(CARBURANT_MAX, val))
  }

  function setObjectif(id: JaugeId, val: number) {
    if (PASSIFS_LIES.includes(id)) {
      enclosActif.value.etats[id].objectif = Math.max(0, Math.min(OBJECTIF_MAX_PASSIVE, val))
    } else {
      enclosActif.value.etats[id].objectif = Math.max(0, Math.min(OBJECTIF_MAX_ACTIVE, val))
    }
  }

  return {
    enclos, enclosActifId, enclosActif,
    nbMontures, jaugesActives, etats, timerSource,
    MAX_ACTIVES,
    selectionnerEnclos, toggleJauge, setValeurActuelle, setObjectif,
  }
}
