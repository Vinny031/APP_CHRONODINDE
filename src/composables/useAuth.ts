// Composable auth — singleton module-level pour état global partagé
// Interface publique unique : tous les composants importent uniquement ce fichier.
// Portage Netlify : seul useAuthStorage.ts change.

import { ref, readonly } from 'vue'
import type { AuthUser } from '@/types/auth'
import {
  findUser, createUser, updateUser, deleteUser,
  saveSession, loadSession, clearSession,
} from '@/composables/useAuthStorage'
import {
  generateSalt, hashPassword, encryptJSON,
  timingSafeEqual, bufToBase64url, base64urlToBuf,
} from '@/composables/useCrypto'

// --- État réactif singleton ---
const isAuthenticated = ref(false)
const currentUser = ref<AuthUser | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Modal
const showAuthModal = ref(false)
const authModalTab = ref<'login' | 'register'>('login')

// Dropdown compte
const showAccountDropdown = ref(false)

// Validation username
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

function normalise(username: string): string {
  return username.trim().toLowerCase()
}

// --- Restauration de session au chargement ---
function restoreSession() {
  const session = loadSession()
  if (session?.username) {
    currentUser.value = { username: session.username, createdAt: session.createdAt }
    isAuthenticated.value = true
  }
}
restoreSession()

// --- Actions auth ---

async function register(username: string, password: string): Promise<void> {
  error.value = null
  isLoading.value = true
  try {
    const uname = normalise(username)

    if (!USERNAME_RE.test(username.trim())) {
      throw new Error('Nom d\'utilisateur : 3-20 caractères, lettres, chiffres ou _')
    }
    if (password.length < 8) {
      throw new Error('Mot de passe trop court (8 caractères minimum)')
    }

    const existing = await findUser(uname)
    if (existing) throw new Error('Ce nom d\'utilisateur est déjà pris')

    const salt = generateSalt()
    const pwHash = await hashPassword(password, salt)
    const { ciphertext, iv, encSalt } = await encryptJSON({ username: uname }, password)
    const now = Date.now()

    await createUser({
      username: uname,
      passwordHash: pwHash,
      salt: bufToBase64url(salt),
      encryptedData: ciphertext,
      iv,
      encSalt,
      createdAt: now,
      updatedAt: now,
    })

    const user: AuthUser = { username: uname, createdAt: now }
    currentUser.value = user
    isAuthenticated.value = true
    saveSession({ username: uname, createdAt: now })
    showAuthModal.value = false
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    isLoading.value = false
  }
}

async function login(username: string, password: string): Promise<void> {
  error.value = null
  isLoading.value = true
  try {
    const uname = normalise(username)
    const record = await findUser(uname)

    // Message générique pour éviter l'énumération d'utilisateurs
    const ERR = 'Identifiant ou mot de passe incorrect'
    if (!record) throw new Error(ERR)

    const saltBuf = new Uint8Array(base64urlToBuf(record.salt))
    const computedHash = await hashPassword(password, saltBuf)

    if (!timingSafeEqual(computedHash, record.passwordHash)) throw new Error(ERR)

    const user: AuthUser = { username: record.username, createdAt: record.createdAt }
    currentUser.value = user
    isAuthenticated.value = true
    saveSession({ username: record.username, createdAt: record.createdAt })
    showAuthModal.value = false
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    isLoading.value = false
  }
}

function logout(): void {
  currentUser.value = null
  isAuthenticated.value = false
  clearSession()
  showAccountDropdown.value = false
}

async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentUser.value) return
  error.value = null
  isLoading.value = true
  try {
    const uname = currentUser.value.username
    const record = await findUser(uname)
    if (!record) throw new Error('Compte introuvable')

    const saltBuf = new Uint8Array(base64urlToBuf(record.salt))
    const computedHash = await hashPassword(currentPassword, saltBuf)
    if (!timingSafeEqual(computedHash, record.passwordHash)) {
      throw new Error('Mot de passe actuel incorrect')
    }
    if (newPassword.length < 8) throw new Error('Nouveau mot de passe trop court (8 min)')

    const newSalt = generateSalt()
    const newHash = await hashPassword(newPassword, newSalt)
    const { ciphertext, iv, encSalt } = await encryptJSON({ username: uname }, newPassword)

    await updateUser({
      username: uname,
      passwordHash: newHash,
      salt: bufToBase64url(newSalt),
      encryptedData: ciphertext,
      iv,
      encSalt,
    })
  } catch (e) {
    error.value = (e as Error).message
    throw e
  } finally {
    isLoading.value = false
  }
}

async function deleteAccount(password: string): Promise<void> {
  if (!currentUser.value) return
  error.value = null
  isLoading.value = true
  try {
    const uname = currentUser.value.username
    const record = await findUser(uname)
    if (!record) throw new Error('Compte introuvable')

    const saltBuf = new Uint8Array(base64urlToBuf(record.salt))
    const computedHash = await hashPassword(password, saltBuf)
    if (!timingSafeEqual(computedHash, record.passwordHash)) {
      throw new Error('Mot de passe incorrect')
    }

    await deleteUser(uname)
    logout()
  } catch (e) {
    error.value = (e as Error).message
    throw e
  } finally {
    isLoading.value = false
  }
}

// --- Helpers modal ---
function openLogin() { authModalTab.value = 'login'; showAuthModal.value = true; error.value = null }
function openRegister() { authModalTab.value = 'register'; showAuthModal.value = true; error.value = null }
function closeModal() { showAuthModal.value = false; error.value = null }

// --- Helpers dropdown ---
function toggleDropdown() { showAccountDropdown.value = !showAccountDropdown.value }
function closeDropdown() { showAccountDropdown.value = false }

// --- Export composable ---
export function useAuth() {
  return {
    isAuthenticated: readonly(isAuthenticated),
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    error,
    showAuthModal,
    authModalTab,
    showAccountDropdown,
    register,
    login,
    logout,
    changePassword,
    deleteAccount,
    openLogin,
    openRegister,
    closeModal,
    toggleDropdown,
    closeDropdown,
  }
}
