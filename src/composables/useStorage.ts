import type { JaugeId, JaugeState, EnclosState } from '@/types'

const DB_NAME = 'dofus-elevage'
const DB_VERSION = 2
const STORE = 'state'
const KEY = 'app'

export interface PersistedState {
  enclos: EnclosState[]
  enclosActifId: number
}

function defaultEtats(): Record<JaugeId, JaugeState> {
  return {
    foudroyeur: { id: 'foudroyeur', valeurActuelle: 50000, objectif: 0, enabled: false },
    abreuvoir:  { id: 'abreuvoir',  valeurActuelle: 50000, objectif: 0, enabled: false },
    dragofesse: { id: 'dragofesse', valeurActuelle: 50000, objectif: 0, enabled: false },
    mangeoire:  { id: 'mangeoire',  valeurActuelle: 50000, objectif: 0, enabled: false },
    baffeur:    { id: 'baffeur',    valeurActuelle: 50000, objectif: 0, enabled: false },
    caresseur:  { id: 'caresseur',  valeurActuelle: 50000, objectif: 0, enabled: false },
  }
}

export function defaultEnclos(id: number): EnclosState {
  return {
    id,
    nbMontures: 1,
    jaugesActives: [],
    etats: defaultEtats(),
    timerSource: null,
  }
}

function openDB(): Promise<IDBDatabase> {
  const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      // Supprimer l'ancien store si migration v1→v2
      if (e.oldVersion < 2 && db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE)
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('IndexedDB timeout')), 5000)
  )
  return Promise.race([dbPromise, timeout])
}

export async function loadState(): Promise<PersistedState | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveState(state: PersistedState): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(state, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
