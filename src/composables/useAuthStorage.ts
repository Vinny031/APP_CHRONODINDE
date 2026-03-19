// Couche de persistance pour l'authentification — IndexedDB + localStorage
// C'est le seul fichier à remplacer lors du portage vers un backend Netlify.

import type { AuthUserRecord, AuthSession } from '@/types/auth'
import { openDB, STORE_AUTH } from '@/composables/db'

const LS_SESSION_KEY = 'dofus-elevage:session'

// --- CRUD utilisateurs ---

export async function findUser(username: string): Promise<AuthUserRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUTH, 'readonly')
    const req = tx.objectStore(STORE_AUTH).get(username)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function createUser(record: AuthUserRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUTH, 'readwrite')
    tx.objectStore(STORE_AUTH).add(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function updateUser(record: Partial<AuthUserRecord> & { username: string }): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUTH, 'readwrite')
    const store = tx.objectStore(STORE_AUTH)
    const getReq = store.get(record.username)
    getReq.onsuccess = () => {
      const existing = getReq.result as AuthUserRecord
      if (!existing) { reject(new Error('Utilisateur introuvable')); return }
      store.put({ ...existing, ...record, updatedAt: Date.now() })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteUser(username: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUTH, 'readwrite')
    tx.objectStore(STORE_AUTH).delete(username)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// --- Session (localStorage synchrone) ---

export function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session))
  } catch { /* silencieux — ne bloque pas l'UX */ }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(LS_SESSION_KEY)
  } catch { /* silencieux */ }
}
