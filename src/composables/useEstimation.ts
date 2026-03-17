import { computed } from 'vue'
import type { Ref } from 'vue'
import type { JaugeId, EstimationResult, EnclosState } from '@/types'
import { getDeltaForLevel } from '@/composables/jaugesConfig'

// Nombre maximum de cycles de simulation pour éviter une boucle infinie.
const MAX_CYCLES_SIMULATION = 1_000_000

// Durée d'un cycle de jeu en secondes.
const DUREE_CYCLE_SECONDES = 10

export function estimerJaugePourEnclos(enc: EnclosState, id: JaugeId): EstimationResult {
  const { valeurActuelle, objectif } = enc.etats[id]

  if (objectif <= 0) {
    return { jaugeId: id, valeurDepart: valeurActuelle, objectif, tempsSecondes: 0, nbCycles: 0, possible: true }
  }

  let carburant = valeurActuelle
  let statManquante = objectif
  let cycles = 0

  while (statManquante > 0 && carburant > 0 && cycles < MAX_CYCLES_SIMULATION) {
    const delta = getDeltaForLevel(carburant)
    if (delta === 0) break
    carburant = Math.max(0, carburant - delta * enc.nbMontures)
    statManquante = Math.max(0, statManquante - delta)
    cycles++
  }

  const possible = statManquante <= 0
  const tempsSecondes = cycles * DUREE_CYCLE_SECONDES

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

export function tempsSourcePourEnclos(enc: EnclosState): number {
  if (enc.jaugesActives.length === 0) return 0
  const src = enc.timerSource && enc.jaugesActives.includes(enc.timerSource) ? enc.timerSource : null
  if (src) return estimerJaugePourEnclos(enc, src).tempsSecondes
  return Math.max(...enc.jaugesActives.map(id => estimerJaugePourEnclos(enc, id).tempsSecondes))
}

export function useEstimation(enclosActif: Ref<EnclosState>) {
  const estimations = computed<EstimationResult[]>(() =>
    enclosActif.value.jaugesActives.map(id => estimerJaugePourEnclos(enclosActif.value, id))
  )

  const tempsTotal = computed(() => {
    if (estimations.value.length === 0) return 0
    return Math.max(...estimations.value.map(e => e.tempsSecondes))
  })

  const tempsSource = computed(() => tempsSourcePourEnclos(enclosActif.value))

  return { estimations, tempsTotal, tempsSource }
}
