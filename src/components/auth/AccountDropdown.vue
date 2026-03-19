<template>
  <div class="relative" ref="containerRef">
    <!-- Avatar bouton -->
    <button
      class="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-white/5"
      @click="auth.toggleDropdown()"
      aria-label="Compte utilisateur"
    >
      <img src="/icons/icon_avatar.webp" alt="avatar" class="h-8 w-8 rounded-full object-cover border border-white/20" />
      <span class="hidden sm:block text-sm text-white/70 max-w-[100px] truncate">
        {{ currentUser?.username }}
      </span>
      <i class="fa-solid fa-chevron-down text-[10px] text-white/30 transition-transform"
         :class="{ 'rotate-180': showAccountDropdown }" aria-hidden="true" />
    </button>

    <!-- Dropdown menu -->
    <Transition
      enter-from-class="opacity-0 -translate-y-1"
      enter-active-class="transition duration-150 ease-out"
      leave-to-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
    >
      <div
        v-if="showAccountDropdown"
        class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 shadow-xl z-[60] overflow-hidden"
        style="background: rgba(20,20,40,0.98); backdrop-filter: blur(16px);"
      >
        <!-- Actions -->
        <div class="py-1">
          <button
            class="dropdown-item"
            @click="openChangePassword"
          >
            <i class="fa-solid fa-key w-4 text-center" aria-hidden="true" />
            Changer le mot de passe
          </button>

          <button
            class="dropdown-item text-red-400 hover:bg-red-400/10"
            @click="openDeleteAccount"
          >
            <i class="fa-solid fa-trash-can w-4 text-center" aria-hidden="true" />
            Supprimer le compte
          </button>
        </div>

        <div class="border-t border-white/8 py-1">
          <button
            class="dropdown-item"
            @click="auth.logout()"
          >
            <i class="fa-solid fa-right-from-bracket w-4 text-center" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Sous-modal : changer mot de passe -->
  <Teleport to="body">
    <div
      v-if="showChangePass"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style="background: rgba(10,10,20,0.85); backdrop-filter: blur(8px);"
      @click.self="showChangePass = false"
    >
      <div class="card-dofus w-full max-w-xs relative">
        <button class="absolute top-3 right-3 text-white/30 hover:text-white/70 transition-colors" @click="showChangePass = false">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <h2 class="text-sm font-bold text-white mb-4"><i class="fa-solid fa-key mr-2 text-[#e94560]" aria-hidden="true" />Changer le mot de passe</h2>
        <form @submit.prevent="submitChangePassword" class="flex flex-col gap-3">
          <div class="relative">
            <input v-model="cpCurrent" :type="showCpCurrent ? 'text' : 'password'" placeholder="Mot de passe actuel" class="auth-input pr-9" :disabled="isLoading" required />
            <button type="button" class="pw-toggle" :class="{ active: showCpCurrent }" @click="showCpCurrent = !showCpCurrent" tabindex="-1"><i :class="showCpCurrent ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" /></button>
          </div>
          <div class="relative">
            <input v-model="cpNew" :type="showCpNew ? 'text' : 'password'" placeholder="Nouveau mot de passe (8 min)" class="auth-input pr-9" :disabled="isLoading" minlength="8" required />
            <button type="button" class="pw-toggle" :class="{ active: showCpNew }" @click="showCpNew = !showCpNew" tabindex="-1"><i :class="showCpNew ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" /></button>
          </div>
          <div class="relative">
            <input v-model="cpConfirm" :type="showCpConfirm ? 'text' : 'password'" placeholder="Confirmer" class="auth-input pr-9" :disabled="isLoading" required />
            <button type="button" class="pw-toggle" :class="{ active: showCpConfirm }" @click="showCpConfirm = !showCpConfirm" tabindex="-1"><i :class="showCpConfirm ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" /></button>
          </div>
          <div v-if="cpError" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{{ cpError }}</div>
          <div v-if="cpSuccess" class="text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{{ cpSuccess }}</div>
          <button type="submit" class="auth-btn-primary" :disabled="isLoading">
            <i class="fa-solid fa-spinner fa-spin mr-2" v-if="isLoading" aria-hidden="true" />
            <i class="fa-solid fa-check mr-2" v-else aria-hidden="true" />
            Confirmer
          </button>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Sous-modal : supprimer compte -->
  <Teleport to="body">
    <div
      v-if="showDeleteAcc"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style="background: rgba(10,10,20,0.85); backdrop-filter: blur(8px);"
      @click.self="showDeleteAcc = false"
    >
      <div class="card-dofus w-full max-w-xs relative border-red-400/30">
        <button class="absolute top-3 right-3 text-white/30 hover:text-white/70 transition-colors" @click="showDeleteAcc = false">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <h2 class="text-sm font-bold text-red-400 mb-2"><i class="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />Supprimer le compte</h2>
        <p class="text-xs text-white/40 mb-4">Cette action est irréversible. Entrez votre mot de passe pour confirmer.</p>
        <form @submit.prevent="submitDeleteAccount" class="flex flex-col gap-3">
          <div class="relative">
            <input v-model="delPassword" :type="showDelPw ? 'text' : 'password'" placeholder="Mot de passe" class="auth-input pr-9 border-red-400/30" :disabled="isLoading" required />
            <button type="button" class="pw-toggle" :class="{ active: showDelPw }" @click="showDelPw = !showDelPw" tabindex="-1"><i :class="showDelPw ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" /></button>
          </div>
          <div v-if="delError" class="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{{ delError }}</div>
          <button type="submit" class="auth-btn-danger" :disabled="isLoading">
            <i class="fa-solid fa-spinner fa-spin mr-2" v-if="isLoading" aria-hidden="true" />
            <i class="fa-solid fa-trash-can mr-2" v-else aria-hidden="true" />
            Supprimer définitivement
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()
const { currentUser, showAccountDropdown, isLoading } = auth

// --- Fermeture au clic extérieur ---
const containerRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    auth.closeDropdown()
  }
}
onMounted(() => document.addEventListener('click', onClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onClickOutside, true))

// --- Changer mot de passe ---
const showChangePass = ref(false)
const cpCurrent = ref('')
const cpNew = ref('')
const cpConfirm = ref('')
const cpError = ref('')
const cpSuccess = ref('')
const showCpCurrent = ref(false)
const showCpNew = ref(false)
const showCpConfirm = ref(false)

function openChangePassword() {
  auth.closeDropdown()
  cpCurrent.value = ''; cpNew.value = ''; cpConfirm.value = ''
  cpError.value = ''; cpSuccess.value = ''
  showChangePass.value = true
}

async function submitChangePassword() {
  cpError.value = ''; cpSuccess.value = ''
  if (cpNew.value !== cpConfirm.value) { cpError.value = 'Les mots de passe ne correspondent pas'; return }
  try {
    await auth.changePassword(cpCurrent.value, cpNew.value)
    cpSuccess.value = 'Mot de passe modifié avec succès !'
    cpCurrent.value = ''; cpNew.value = ''; cpConfirm.value = ''
  } catch (e) {
    cpError.value = (e as Error).message
  }
}

// --- Supprimer compte ---
const showDeleteAcc = ref(false)
const delPassword = ref('')
const delError = ref('')
const showDelPw = ref(false)

function openDeleteAccount() {
  auth.closeDropdown()
  delPassword.value = ''; delError.value = ''
  showDeleteAcc.value = true
}

async function submitDeleteAccount() {
  delError.value = ''
  try {
    await auth.deleteAccount(delPassword.value)
    showDeleteAcc.value = false
  } catch (e) {
    delError.value = (e as Error).message
  }
}
</script>
