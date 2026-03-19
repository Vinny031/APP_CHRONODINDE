<template>
  <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-white/50 uppercase tracking-widest font-medium">Nom d'utilisateur</label>
      <input
        v-model="username"
        type="text"
        autocomplete="username"
        placeholder="votre_pseudo"
        class="auth-input"
        :disabled="isLoading"
        required
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-white/50 uppercase tracking-widest font-medium">Mot de passe</label>
      <div class="relative">
        <input
          v-model="password"
          :type="showPw ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          class="auth-input pr-9"
          :disabled="isLoading"
          required
        />
        <button type="button" class="pw-toggle" :class="{ active: showPw }" @click="showPw = !showPw" tabindex="-1">
          <i :class="showPw ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="error" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20">
      <i class="fa-solid fa-circle-exclamation mr-2" aria-hidden="true" />{{ error }}
    </div>

    <button type="submit" class="auth-btn-primary" :disabled="isLoading">
      <span v-if="isLoading">
        <i class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true" />Connexion…
      </span>
      <span v-else>
        <i class="fa-solid fa-right-to-bracket mr-2" aria-hidden="true" />Se connecter
      </span>
    </button>

  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()
const { isLoading, error } = auth

const username = ref('')
const password = ref('')
const showPw = ref(false)

async function handleSubmit() {
  await auth.login(username.value, password.value)
}
</script>
