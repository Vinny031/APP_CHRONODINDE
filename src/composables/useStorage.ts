import type { JaugeId, JaugeState, EnclosState } from '@/types'

const DB_NAME = 'dofus-elevage'
const DB_VERSION = 3  // v3 : schéma granulaire (une clé par enclos)
const STORE = 'state'

// Délai maximum d'attente pour l'ouverture d'IndexedDB.
// Au-delà, on considère que le navigateur bloque l'accès (ex: mode privé strict).
const DB_OPEN_TIMEOUT_MS = 5_000

// Clés de stockage
const KEY_ENCLOS_ACTIF_ID = 'enclosActifId'
const keyEnclos = (id: number) => `enclos/${id}`
// Ancienne clé monolithique (v2) — utilisée uniquement pour la migration
const LEGACY_KEY = 'app'

export interface PersistedState {
  enclos: EnclosState[]
  enclosActifId: number
}

function defaultEtats(): Record<JaugeId, JaugeState> {
  return {
    foudroyeur: { id: 'foudroyeur', valeurActuelle: 0, objectif: 0, enabled: false },
    abreuvoir:  { id: 'abreuvoir',  valeurActuelle: 0, objectif: 0, enabled: false },
    dragofesse: { id: 'dragofesse', valeurActuelle: 0, objectif: 0, enabled: false },
    mangeoire:  { id: 'mangeoire',  valeurActuelle: 0, objectif: 0, enabled: false },
    baffeur:    { id: 'baffeur',    valeurActuelle: 0, objectif: 0, enabled: false },
    caresseur:  { id: 'caresseur',  valeurActuelle: 0, objectif: 0, enabled: false },
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

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      // Supprimer l'ancien store pour migration v1→v2 ou v2→v3
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE)
      }
      db.createObjectStore(STORE)
    }
    req.onsuccess = () => {
      _db = req.result
      // Réinitialiser le cache si la connexion est fermée de l'extérieur
      _db.onclose = () => { _db = null }
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('IndexedDB timeout')), DB_OPEN_TIMEOUT_MS)
  )
  return Promise.race([dbPromise, timeout])
}

// Lecture d'une seule clé dans le store
function getKey<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Écriture d'une seule clé dans le store
function putKey(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const db = await openDB()

    // Lire les enclos individuellement (schéma v3)
    const enclos: EnclosState[] = []
    for (const id of [1, 2, 3, 4, 5, 6]) {
      const enc: EnclosState | undefined = await getKey(db, keyEnclos(id))
      if (enc) enclos.push(enc)
    }

    if (enclos.length > 0) {
      const enclosActifId: number = (await getKey<number>(db, KEY_ENCLOS_ACTIF_ID)) ?? 1
      return { enclos, enclosActifId }
    }

    // Migration depuis schéma v2 : lire l'ancienne clé monolithique
    const legacy: PersistedState | undefined = await getKey(db, LEGACY_KEY)
    if (legacy?.enclos && legacy.enclos.length > 0) {
      await saveEnclosActifId(db, legacy.enclosActifId)
      for (const enc of legacy.enclos) {
        await saveEnclos(db, enc)
      }
      return legacy
    }

    return null

  } catch (err) {
    console.error('[useStorage] Échec du chargement de l\'état :', err)
    return null
  }
}

// --- Fonctions de sauvegarde granulaires ---

async function saveEnclosActifId(db: IDBDatabase, id: number): Promise<void> {
  await putKey(db, KEY_ENCLOS_ACTIF_ID, id)
}

async function saveEnclos(db: IDBDatabase, enc: EnclosState): Promise<void> {
  // Déproxifier les objets réactifs Vue + exclure timerSource (non clonable)
  const { timerSource: _, ...rest } = enc
  const serializable = JSON.parse(JSON.stringify(rest))
  await putKey(db, keyEnclos(enc.id), serializable)
}

export async function persistEnclosActifId(id: number): Promise<void> {
  try {
    const db = await openDB()
    await saveEnclosActifId(db, id)
  } catch (err) {
    console.error('[useStorage] Échec sauvegarde enclosActifId :', err)
    throw err
  }
}

export async function persistEnclos(enc: EnclosState): Promise<void> {
  try {
    const db = await openDB()
    await saveEnclos(db, enc)
  } catch (err) {
    console.error('[useStorage] Échec sauvegarde enclos :', err)
    throw err
  }
}
