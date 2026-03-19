<template>
  <header class="sticky top-0 z-50 border-b border-white/8" style="background: rgba(15,15,30,0.97); backdrop-filter: blur(16px);">
    <div class="max-w-5xl mx-auto px-5 py-0 flex items-center justify-between gap-4 h-16">

      <!-- Logo + nom -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="absolute inset-0 rounded-xl blur-md opacity-40" style="background: radial-gradient(circle, #e94560, transparent);" />
          <img src="/icons/favicon.webp" alt="ChronoDinde" class="relative h-16 w-16 rounded-xl object-contain" />
        </div>
        <div class="flex flex-col leading-none gap-1">
          <span class="font-extrabold text-xl tracking-tight text-white">Chrono<span style="color:#e94560">Dinde</span></span>
          <span class="text-[10px] text-white/30 tracking-widest uppercase font-medium">Élevage Timer</span>
        </div>
      </div>

      <!-- Zone auth (droite) -->
      <div class="flex items-center">
        <!-- Connecté : dropdown avatar -->
        <AccountDropdown v-if="isAuthenticated" />

        <!-- Non connecté : bouton unique -->
        <button
          v-else
          class="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-white/5 text-sm text-white/70 hover:text-white"
          @click="auth.openLogin()"
        >
          <img src="/icons/icon_avatar.webp" alt="" class="h-8 w-8 rounded-full object-cover opacity-40" />
          <span class="hidden sm:inline">Connexion</span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import AccountDropdown from '@/components/auth/AccountDropdown.vue'

const auth = useAuth()
const { isAuthenticated } = auth
</script>
