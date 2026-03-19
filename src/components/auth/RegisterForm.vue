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
        minlength="3"
        maxlength="20"
        required
      />
      <span class="text-[10px] text-white/25">3-20 caractères, lettres, chiffres ou _</span>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-white/50 uppercase tracking-widest font-medium">Mot de passe</label>
      <div class="relative">
        <input
          v-model="password"
          :type="showPw ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="8 caractères minimum"
          class="auth-input pr-9"
          :disabled="isLoading"
          minlength="8"
          required
        />
        <button type="button" class="pw-toggle" :class="{ active: showPw }" @click="showPw = !showPw" tabindex="-1">
          <i :class="showPw ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" />
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <label class="text-xs text-white/50 uppercase tracking-widest font-medium">Confirmer le mot de passe</label>
      <div class="relative">
        <input
          v-model="confirmPassword"
          :type="showPwConfirm ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="••••••••"
          class="auth-input pr-9"
          :class="{ 'border-red-400/50': confirmPassword && password !== confirmPassword }"
          :disabled="isLoading"
          required
        />
        <button type="button" class="pw-toggle" :class="{ active: showPwConfirm }" @click="showPwConfirm = !showPwConfirm" tabindex="-1">
          <i :class="showPwConfirm ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" />
        </button>
      </div>
    </div>

    <div v-if="localError || error" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20">
      <i class="fa-solid fa-circle-exclamation mr-2" />{{ localError || error }}
    </div>

    <button type="submit" class="auth-btn-primary" :disabled="isLoading">
      <span v-if="isLoading">
        <i class="fa-solid fa-spinner fa-spin mr-2" />Création du compte…
      </span>
      <span v-else>
        <i class="fa-solid fa-user-plus mr-2" />Créer mon compte
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
const confirmPassword = ref('')
const localError = ref('')
const showPw = ref(false)
const showPwConfirm = ref(false)

async function handleSubmit() {
  localError.value = ''
  if (password.value !== confirmPassword.value) {
    localError.value = 'Les mots de passe ne correspondent pas'
    return
  }
  await auth.register(username.value, password.value)
}
</script>
