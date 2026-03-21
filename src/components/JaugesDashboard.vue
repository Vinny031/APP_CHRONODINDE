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
            style="font-size: 9px; color: rgba(255,255,255,0.65); white-space: nowrap; transform: translateY(-50%);"
            :style="{ top: toPercentageFromTop(t.v) + '%' }"
          >{{ t.l }}</span>
        </div>

        <!-- Zone principale : grille + barres -->
        <div class="relative flex-1">

          <!-- Grille horizontale (lignes aux seuils) -->
          <div class="absolute inset-0 pointer-events-none" style="z-index:1;">
            <div v-for="t in TICKS" :key="t.v"
              class="absolute left-0 right-0"
              :style="{ top: toPercentageFromTop(t.v) + '%', height: '1px', background: 'rgba(255,255,255,0.08)' }"
            />
          </div>

<!-- Barres : 6 colonnes égales, séparateur après les passives -->
          <div class="absolute inset-0 flex items-end" style="z-index:2;">
            <template v-for="(j, i) in jauges" :key="j.id">
              <!-- Séparateur entre passives (2) et actives (4) -->
              <div v-if="i === 2" :style="{ width: SEPARATOR_WIDTH + 'px', flexShrink: 0 }" />
              <div class="flex-1 flex justify-center items-end h-full">
                <BarreVerticale
                  :jauge="j" :etat="etats[j.id]"
                  :is-active="etats[j.id].enabled"
                  :is-max-reached="jaugesActives.length >= MAX_ACTIVES"
                  :is-selected="jaugeSelectionnee === j.id"
                  :col-width="COL"
                  :bar-width="j.type === 'passive' ? BAR_P : BAR_A"
                  :barre-height="barreHeight"
                  @toggle="$emit('toggle', j.id)"
                  @set-valeur="$emit('setValeur', j.id, $event)"
                  @set-objectif="$emit('setObjectif', j.id, $event)"
                />
              </div>
            </template>
          </div>
        </div>

        <!-- Axe Y droit supprimé -->

      </div>
    </div>

    <!-- Séparateur -->
    <div class="mx-4 mt-3" style="height:1px; background:rgba(255,255,255,0.07);" />

    <!-- Icônes sous les barres — alignées avec la zone principale -->
    <div class="flex py-3 px-4">
      <!-- Offset axe Y gauche -->
      <div style="width: 34px; flex-shrink: 0;" />

      <!-- Icônes : même structure exacte que les barres (6 flex-1 + séparateur après 2) -->
      <div class="flex flex-1 items-center" style="position: relative;">
        <template v-for="(j, i) in jauges" :key="j.id">
          <div v-if="i === 2" :style="{ width: SEPARATOR_WIDTH + 'px', flexShrink: 0 }" />
          <div class="flex-1 flex flex-col items-center gap-1" style="position: relative;"
            @mouseenter="hoveredJauge = j.id"
            @mouseleave="hoveredJauge = null"
          >
            <IconBtn :cfg="JAUGES_CONFIGS[j.id]"
              :active="etats[j.id].enabled"
              :selected="jaugeSelectionnee === j.id"
              :disabled="false"
              :aria-label="j.nom"
              @click="$emit('toggle', j.id)"
            />
            <!-- Rouage visible au hover -->
            <div class="flex justify-center" style="height: 16px; margin-top: 6px;">
              <button
                v-show="hoveredJauge === j.id || jaugeSelectionnee === j.id"
                class="transition-all duration-150"
                :style="{
                  fontSize: '11px',
                  color: jaugeSelectionnee === j.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.65)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                }"
                @click="jaugeSelectionnee = jaugeSelectionnee === j.id ? null : j.id"
              >
                <i class="fa-solid fa-gear" aria-hidden="true" />
              </button>
            </div>
            <!-- Panel paliers ancré sous cette icône -->
            <div
              v-if="jaugeSelectionnee === j.id"
              ref="panelContainerRef"
              style="position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 50; width: 340px;"
            >
              <PalierPanel
                :jauge="j"
                :etat="etats[j.id]"
                @close="jaugeSelectionnee = null"
                @set-valeur="(id, v) => { $emit('setValeur', id, v) }"
              />
            </div>
          </div>
        </template>
        <!-- Icône lien entre les 2 passives : centré entre col 0 et col 1 -->
        <div style="position: absolute; left: calc(100% / 6); top: 100%; transform: translate(-50%, 4px); pointer-events: none;">
          <i class="fa-solid fa-link" style="font-size: 12px; color: rgba(192,132,252,0.45);" aria-hidden="true" />
        </div>
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
      <span style="font-size: 11px; color: rgba(255,255,255,0.65);">{{ jaugesActives.length }}/2 jauges activées</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from 'vue'
import BarreVerticale from '@/components/BarreVerticale.vue'
import PalierPanel from '@/components/PalierPanel.vue'
import type { Jauge, JaugeState, JaugeId } from '@/types'
import { JAUGES_CONFIGS } from '@/composables/jaugesConfig'

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
const jaugeSelectionnee = ref<string | null>(null)
const hoveredJauge = ref<string | null>(null)
const panelContainerRef = ref<HTMLElement | HTMLElement[] | null>(null)

function onDocumentClick(e: MouseEvent) {
  if (!jaugeSelectionnee.value) return
  const el = Array.isArray(panelContainerRef.value) ? panelContainerRef.value[0] : panelContainerRef.value
  if (el && !el.contains(e.target as Node)) {
    jaugeSelectionnee.value = null
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentClick))

const passives = computed(() => props.jauges.filter(j => j.type === 'passive'))
const actives  = computed(() => props.jauges.filter(j => j.type === 'active'))

// ── Dimensions dynamiques selon la zone disponible ─────────────────────────
const SEPARATOR_WIDTH = 20 // espace entre groupe passives et groupe actives

const COL = computed(() => {
  const zone = props.zoneWidth ?? 0
  if (zone <= 0) return 44
  return Math.floor((zone - SEPARATOR_WIDTH) / 6)
})

const BAR_P = computed(() => Math.min(28, Math.max(8, Math.floor(COL.value * 0.35))))
const BAR_A = computed(() => Math.min(28, Math.max(8, Math.floor(COL.value * 0.35))))

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

// % depuis le haut (top=0 → 100k, top=100 → 0)
function toPercentageFromTop(v: number) { return (1 - v / 100000) * 100 }

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
</script>
