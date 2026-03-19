<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style="background: rgba(10,10,20,0.85); backdrop-filter: blur(8px);"
      @click.self="auth.closeModal()"
      @keydown.esc.window="auth.closeModal()"
    >
      <div class="card-dofus w-full max-w-sm relative" style="border-color: rgba(255,255,255,0.12);">

        <!-- Bouton fermer -->
        <button
          class="absolute top-3 right-3 text-white/30 hover:text-white/70 transition-colors"
          @click="auth.closeModal()"
          aria-label="Fermer"
        >
          <i class="fa-solid fa-xmark text-lg" />
        </button>

        <!-- Logo + titre -->
        <div class="flex items-center gap-2 mb-5">
          <img src="/icons/favicon.webp" alt="" class="h-8 w-8 rounded-lg object-contain" />
          <span class="font-extrabold text-base text-white">
            Chrono<span style="color:#e94560">Dinde</span>
          </span>
        </div>

        <!-- Onglets switch — style cartes enclos -->
        <div class="flex gap-1.5 mb-5">
          <button
            class="flex-1 py-1.5 rounded-xl border text-sm font-bold transition-all duration-200"
            :class="authModalTab === 'login'
              ? 'bg-white/10 border-white/60 text-white'
              : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:border-white/15'"
            @click="auth.openLogin()"
          >Connexion</button>
          <button
            class="flex-1 py-1.5 rounded-xl border text-sm font-bold transition-all duration-200"
            :class="authModalTab === 'register'
              ? 'bg-white/10 border-white/60 text-white'
              : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:border-white/15'"
            @click="auth.openRegister()"
          >S'inscrire</button>
        </div>

        <!-- Formulaire actif -->
        <LoginForm v-if="authModalTab === 'login'" />
        <RegisterForm v-else />

        <!-- Note sécurité -->
        <p class="mt-4 text-[10px] text-white/20 text-center leading-relaxed">
          <i class="fa-solid fa-lock mr-1" />Données chiffrées localement · Aucun envoi réseau
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const auth = useAuth()
const { authModalTab } = auth
</script>
