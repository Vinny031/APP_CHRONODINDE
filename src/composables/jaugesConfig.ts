import type { JaugeId, Jauge, PaletteConsommation } from '@/types'

export interface JConfig {
  iconClass: string
  iconBg: string
  textClass: string
  borderClass: string
  dotClass: string
  fillClass: string
  glowClass: string
  accentColor: string
  fillColor: string
  glowShadow: string
  // pour JaugesDashboard IconBtn
  bg: string
  border: string
  text: string
  glow: string
}

export const JAUGES_CONFIGS: Record<JaugeId, JConfig> = {
  baffeur:    { iconClass: 'fa-solid fa-minus',    iconBg: 'bg-purple-500/20', textClass: 'text-purple-400', borderClass: 'border-purple-400/60', dotClass: 'bg-purple-400', fillClass: 'bg-purple-400', glowClass: 'glow-purple', accentColor: '#c084fc', fillColor: '#c084fc', glowShadow: '0 0 10px rgba(192,132,252,0.6)', bg: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.75)', text: '#c084fc', glow: '0 0 12px rgba(192,132,252,0.8)' },
  caresseur:  { iconClass: 'fa-solid fa-plus',     iconBg: 'bg-purple-500/20', textClass: 'text-purple-400', borderClass: 'border-purple-400/60', dotClass: 'bg-purple-400', fillClass: 'bg-purple-400', glowClass: 'glow-purple', accentColor: '#c084fc', fillColor: '#c084fc', glowShadow: '0 0 10px rgba(192,132,252,0.6)', bg: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.75)', text: '#c084fc', glow: '0 0 12px rgba(192,132,252,0.8)' },
  foudroyeur: { iconClass: 'fa-solid fa-bolt',     iconBg: 'bg-yellow-500/20', textClass: 'text-yellow-400', borderClass: 'border-yellow-400/60', dotClass: 'bg-yellow-400', fillClass: 'bg-yellow-400', glowClass: 'glow-yellow', accentColor: '#facc15', fillColor: '#facc15', glowShadow: '0 0 12px rgba(250,204,21,0.7)',  bg: 'rgba(250,204,21,0.18)',  border: 'rgba(250,204,21,0.75)',  text: '#facc15', glow: '0 0 14px rgba(250,204,21,0.8)'  },
  abreuvoir:  { iconClass: 'fa-solid fa-droplet',  iconBg: 'bg-cyan-500/20',   textClass: 'text-cyan-400',   borderClass: 'border-cyan-400/60',   dotClass: 'bg-cyan-400',   fillClass: 'bg-cyan-400',   glowClass: 'glow-cyan',   accentColor: '#22d3ee', fillColor: '#22d3ee', glowShadow: '0 0 12px rgba(34,211,238,0.7)',  bg: 'rgba(34,211,238,0.18)',  border: 'rgba(34,211,238,0.75)',  text: '#22d3ee', glow: '0 0 14px rgba(34,211,238,0.8)'  },
  dragofesse: { iconClass: 'fa-solid fa-heart',    iconBg: 'bg-red-500/20',    textClass: 'text-red-400',    borderClass: 'border-red-400/60',    dotClass: 'bg-red-400',    fillClass: 'bg-red-400',    glowClass: 'glow-red',    accentColor: '#f87171', fillColor: '#f87171', glowShadow: '0 0 12px rgba(248,113,113,0.6)', bg: 'rgba(248,113,113,0.18)', border: 'rgba(248,113,113,0.75)', text: '#f87171', glow: '0 0 12px rgba(248,113,113,0.8)' },
  mangeoire:  { iconClass: 'fa-solid fa-seedling', iconBg: 'bg-orange-500/20', textClass: 'text-orange-400', borderClass: 'border-orange-400/60', dotClass: 'bg-orange-400', fillClass: 'bg-orange-400', glowClass: 'glow-orange', accentColor: '#fb923c', fillColor: '#fb923c', glowShadow: '0 0 12px rgba(251,146,60,0.6)',  bg: 'rgba(251,146,60,0.18)',  border: 'rgba(251,146,60,0.75)',  text: '#fb923c', glow: '0 0 12px rgba(251,146,60,0.8)'  },
}

// Palettes de consommation de carburant selon le niveau de la jauge.
// Chaque tranche définit un delta consommé/produit par cycle de 10s.
// Les seuils correspondent aux paliers de l'interface (40k, 70k, 90k, 100k).
export const PALETTES: PaletteConsommation[] = [
  { seuilMin: 90_001, seuilMax: 100_000, delta: 40 },
  { seuilMin: 70_001, seuilMax:  90_000, delta: 30 },
  { seuilMin: 40_001, seuilMax:  70_000, delta: 20 },
  { seuilMin:      0, seuilMax:  40_000, delta: 10 },
]

export function getDeltaForLevel(valeur: number): number {
  for (const p of PALETTES) {
    if (valeur >= p.seuilMin && valeur <= p.seuilMax) return p.delta
  }
  if (valeur <= 0) return 0
  return 40
}

export const JAUGES_DEF: Jauge[] = [
  { id: 'baffeur',    nom: 'Baffeur',    stat: 'Sérénité −', icon: 'fa-minus',    iconClass: 'fa-solid fa-minus',    color: '#c084fc', colorClass: 'text-purple-400', bgClass: 'bg-purple-400', type: 'passive', passiveEffect: 'sereniteneg' },
  { id: 'caresseur',  nom: 'Caresseur',  stat: 'Sérénité +', icon: 'fa-plus',     iconClass: 'fa-solid fa-plus',     color: '#c084fc', colorClass: 'text-purple-400', bgClass: 'bg-purple-400', type: 'passive', passiveEffect: 'serenitepos' },
  { id: 'foudroyeur', nom: 'Foudroyeur', stat: 'Endurance',  icon: 'fa-bolt',     iconClass: 'fa-solid fa-bolt',     color: '#facc15', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-400', type: 'active'  },
  { id: 'abreuvoir',  nom: 'Abreuvoir',  stat: 'Maturité',   icon: 'fa-droplet',  iconClass: 'fa-solid fa-droplet',  color: '#22d3ee', colorClass: 'text-cyan-400',   bgClass: 'bg-cyan-400',   type: 'active'  },
  { id: 'dragofesse', nom: 'Dragofesse', stat: 'Amour',      icon: 'fa-heart',    iconClass: 'fa-solid fa-heart',    color: '#f87171', colorClass: 'text-red-400',    bgClass: 'bg-red-400',    type: 'active'  },
  { id: 'mangeoire',  nom: 'Mangeoire',  stat: 'XP',         icon: 'fa-seedling', iconClass: 'fa-solid fa-seedling', color: '#fb923c', colorClass: 'text-orange-400', bgClass: 'bg-orange-400', type: 'active'  },
]

export const JAUGE_TYPES: Record<JaugeId, 'active' | 'passive'> = {
  foudroyeur: 'active', abreuvoir: 'active', dragofesse: 'active', mangeoire: 'active',
  baffeur: 'passive', caresseur: 'passive',
}
