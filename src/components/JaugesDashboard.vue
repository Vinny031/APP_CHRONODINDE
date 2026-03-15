<template>
  <div
    class="rounded-2xl border border-white/10"
    style="background: rgba(255,255,255,0.03);"
  >
    <div class="p-4 pb-0">
      <div class="flex" :style="{ height: barreHeight + 'px' }">

        <!-- Axe Y gauche -->
        <div class="relative shrink-0 select-none pr-2" style="width: 34px;">
          <span v-for="t in TICKS" :key="t.v"
            class="absolute right-1 font-mono text-right"
            style="font-size: 9px; color: rgba(255,255,255,0.35); white-space: nowrap; transform: translateY(-50%);"
            :style="{ top: pctTop(t.v) + '%' }"
          >{{ t.l }}</span>
        </div>

        <!-- Zone principale : grille + barres -->
        <div class="relative flex-1">

          <!-- Grille horizontale (lignes aux seuils) -->
          <div class="absolute inset-0 pointer-events-none" style="z-index:1;">
            <div v-for="t in TICKS" :key="t.v"
              class="absolute left-0 right-0"
              :style="{ top: pctTop(t.v) + '%', height: '1px', background: 'rgba(255,255,255,0.08)' }"
            />
          </div>

          <!-- Grille verticale (colonnes légères) -->
          <div class="absolute inset-0 pointer-events-none" style="z-index:1;">
            <div v-for="col in nbColLines" :key="col"
              class="absolute top-0 bottom-0"
              :style="{ left: ((col / nbColLines) * 100) + '%', width: '1px', background: 'rgba(255,255,255,0.04)' }"
            />
          </div>

          <!-- Barres : positionnées en absolu, alignées en bas, offsetX pour centrage -->
          <div
            class="absolute bottom-0 left-0 flex items-end"
            style="z-index:2;"
            :style="{ paddingLeft: offsetX + 'px' }"
          >
            <BarreVerticale
              v-for="j in passives" :key="j.id"
              :jauge="j" :etat="etats[j.id]"
              :is-active="etats[j.id].enabled"
              :is-max-reached="jaugesActives.length >= MAX_ACTIVES"
              :col-width="COL" :bar-width="BAR_P" :barre-height="barreHeight"
              @toggle="$emit('toggle', j.id)"
              @set-valeur="$emit('setValeur', j.id, $event)"
              @set-objectif="$emit('setObjectif', j.id, $event)"
            />
            <div :style="{ width: SEP + 'px', flexShrink: 0 }" />
            <BarreVerticale
              v-for="j in actives" :key="j.id"
              :jauge="j" :etat="etats[j.id]"
              :is-active="etats[j.id].enabled"
              :is-max-reached="jaugesActives.length >= MAX_ACTIVES"
              :col-width="COL" :bar-width="BAR_A" :barre-height="barreHeight"
              @toggle="$emit('toggle', j.id)"
              @set-valeur="$emit('setValeur', j.id, $event)"
              @set-objectif="$emit('setObjectif', j.id, $event)"
            />
          </div>
        </div>

        <!-- Axe Y droit supprimé -->

      </div>
    </div>

    <!-- Séparateur -->
    <div class="mx-4 mt-3" style="height:1px; background:rgba(255,255,255,0.07);" />

    <!-- Icônes centrées sous les barres — même offsetX que les barres -->
    <div class="flex py-3 pl-4">
      <!-- Offset axe G -->
      <div style="width: 34px; flex-shrink: 0;" />

      <!-- Groupe icônes aligné sur les barres -->
      <div class="flex items-center" :style="{ paddingLeft: offsetX + 'px' }">

        <!-- Groupe passifs avec lien visuel en absolute -->
        <div style="position: relative; display: flex;">
          <template v-for="j in passives" :key="j.id">
            <div :style="{ width: COL + 'px', display: 'flex', justifyContent: 'center' }">
              <IconBtn :cfg="JAUGES_CONFIGS[j.id]"
                :active="etats[j.id].enabled"
                :disabled="false"
                :aria-label="(etats[j.id].enabled ? 'Désactiver' : 'Activer') + ' ' + j.nom"
                @click="$emit('toggle', j.id)"
              />
            </div>
          </template>
          <!-- Icône lien centrée entre les deux boutons, en dessous -->
          <div style="position: absolute; left: 50%; top: 100%; transform: translate(-50%, 4px); pointer-events: none;">
            <i class="fa-solid fa-link" style="font-size: 12px; color: rgba(192,132,252,0.45);" />
          </div>
        </div>

        <div :style="{ width: SEP + 'px', flexShrink: 0 }" />

        <template v-for="j in actives" :key="j.id">
          <div :style="{ width: COL + 'px', display: 'flex', justifyContent: 'center' }">
            <IconBtn :cfg="JAUGES_CONFIGS[j.id]"
              :active="etats[j.id].enabled"
              :disabled="false"
              :aria-label="(etats[j.id].enabled ? 'Désactiver' : 'Activer') + ' ' + j.nom"
              @click="$emit('toggle', j.id)"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Indicateur -->
    <div class="px-4 pb-3 flex items-center justify-end gap-2">
      <div class="flex gap-1.5">
        <div v-for="i in 2" :key="i"
          class="rounded-full border transition-all duration-300"
          :style="{
            width: '9px', height: '9px',
            background: i <= jaugesActives.length ? '#e94560' : 'transparent',
            borderColor: i <= jaugesActives.length ? '#e94560' : 'rgba(255,255,255,0.2)',
            boxShadow: i <= jaugesActives.length ? '0 0 7px #e94560' : 'none',
          }"
        />
      </div>
      <span style="font-size: 11px; color: rgba(255,255,255,0.4);">{{ jaugesActives.length }}/2 jauges activées</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import BarreVerticale from '@/components/BarreVerticale.vue'
import type { Jauge, JaugeState, JaugeId } from '@/types'
import { JAUGES_CONFIGS } from '@/composables/jaugesConfig'

// ── Dimensions fixes inspirées du screen original ──────────────────────────
const BAR_P = 16   // largeur barre passive (px) — fine
const BAR_A = 16   // largeur barre active (px)  — identique, espacées
const COL   = 44   // espace alloué par colonne (barre centrée dedans)
const SEP   = 14   // espace entre groupe passives et groupe actives
// Les 6 colonnes + 1 séparateur = 6×44 + 14 = 278px de groupe total
// On centre ce groupe dans la zone disponible via offsetX

// ── Axe Y : ticks sur les seuils réels ────────────────────────────────────
const TICKS = [
  { v: 100000, l: '100k' },
  { v: 90000,  l: '90k'  },
  { v: 70000,  l: '70k'  },
  { v: 40000,  l: '40k'  },
  { v: 0,      l: '0'    },
]

// ── Palettes côté droit, alignées sur les seuils supérieurs ───────────────
const PALETTES = [
  { v: 100000, l: '-40 / +40', color: 'rgba(74,222,128,0.85)'  },
  { v: 90000,  l: '-30 / +30', color: 'rgba(250,204,21,0.85)'  },
  { v: 70000,  l: '-20 / +20', color: 'rgba(251,146,60,0.85)'  },
  { v: 40000,  l: '-10 / +10', color: 'rgba(248,113,113,0.85)' },
]

// ── % depuis le haut (top=0 → 100k, top=100 → 0) ─────────────────────────
function pctTop(v: number) { return (1 - v / 100000) * 100 }

// Grille verticale : autant de lignes que de colonnes + 1
const nbColLines = 7

// ── Composant bouton icône ─────────────────────────────────────────────────
type ICfg = { iconClass: string; bg: string; border: string; text: string; glow: string }
const IconBtn = defineComponent({
  props: { cfg: Object as () => ICfg, active: Boolean, disabled: Boolean, ariaLabel: String },
  emits: ['click'],
  setup(p, { emit }) {
    return () => h('button', {
      'aria-label': p.ariaLabel,
      style: {
        width: '36px', height: '36px', borderRadius: '50%', border: '2px solid',
        fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s', flexShrink: '0',
        background:  p.active ? p.cfg!.bg     : 'rgba(255,255,255,0.05)',
        borderColor: p.active ? p.cfg!.border : 'rgba(255,255,255,0.15)',
        color:       p.active ? p.cfg!.text   : 'rgba(255,255,255,0.3)',
        boxShadow:   p.active ? p.cfg!.glow   : 'none',
        transform:   p.active ? 'scale(1.12)' : 'scale(1)',
        cursor:      p.disabled ? 'not-allowed' : 'pointer',
        opacity:     p.disabled ? '0.3' : '1',
      },
      onClick: () => !p.disabled && emit('click'),
    }, [h('i', { class: p.cfg!.iconClass, 'aria-hidden': 'true' })])
  },
})

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps<{
  jauges: Jauge[]
  etats: Record<JaugeId, JaugeState>
  jaugesActives: JaugeId[]
  MAX_ACTIVES: number
  barreHeight?: number
  zoneWidth?: number
}>()

defineEmits<{
  toggle: [id: JaugeId]
  setValeur: [id: JaugeId, val: number]
  setObjectif: [id: JaugeId, val: number]
}>()

const barreHeight = computed(() => props.barreHeight ?? 260)

const passives = computed(() => props.jauges.filter(j => j.type === 'passive'))
const actives  = computed(() => props.jauges.filter(j => j.type === 'active'))

// Largeur du groupe de barres = 6 colonnes + séparateur
const groupW = 6 * COL + SEP

// Centrage dans la zone disponible
const offsetX = computed(() => {
  const zone = props.zoneWidth ?? 0
  return zone > groupW ? Math.floor((zone - groupW) / 2) : 0
})
</script>
