export type JaugeId = 'foudroyeur' | 'abreuvoir' | 'dragofesse' | 'mangeoire' | 'baffeur' | 'caresseur'

export interface Jauge {
  id: JaugeId
  nom: string
  stat: string
  icon: string
  iconClass: string
  color: string
  colorClass: string
  bgClass: string
  type: 'active' | 'passive'
  passiveEffect?: 'sereniteneg' | 'serenitepos'
}

export interface JaugeState {
  id: JaugeId
  valeurActuelle: number
  objectif: number
enabled: boolean
}

export interface TimerConfig {
  nbMontures: number
  jaugesActives: JaugeId[]
  etats: Record<JaugeId, JaugeState>
}

export interface EnclosState {
  id: number          // 1–6
  nbMontures: number
  jaugesActives: JaugeId[]
  etats: Record<JaugeId, JaugeState>
  timerSource: JaugeId | null
}

export interface PaletteConsommation {
  seuilMin: number
  seuilMax: number
  delta: number
}

export interface EstimationResult {
  jaugeId: JaugeId
  valeurDepart: number
  objectif: number
  tempsSecondes: number
  nbCycles: number
  possible: boolean
  message?: string
}
