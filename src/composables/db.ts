// Singleton IndexedDB — une seule ouverture, un seul onupgradeneeded
// Importé par useStorage.ts et useAuthStorage.ts

export const DB_NAME = 'dofus-elevage'
export const DB_VERSION = 4
export const STORE_STATE = 'state'
export const STORE_AUTH = 'auth'

let _db: IDBDatabase | null = null
let _opening: Promise<IDBDatabase> | null = null

function doOpen(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = req.result
      const oldVersion = e.oldVersion

      if (oldVersion < 3) {
        if (db.objectStoreNames.contains(STORE_STATE)) db.deleteObjectStore(STORE_STATE)
        db.createObjectStore(STORE_STATE)
      }
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_AUTH)) {
          db.createObjectStore(STORE_AUTH, { keyPath: 'username' })
        }
      }
    }

    req.onsuccess = () => {
      _db = req.result
      _db.onversionchange = () => { _db?.close(); _db = null; _opening = null }
      _db.onclose = () => { _db = null; _opening = null }
      resolve(_db)
    }

    req.onerror = () => reject(req.error)

    req.onblocked = () => {
      // Une connexion encore ouverte (autre onglet ou ref orpheline) bloque la migration.
      // On ferme notre propre ref si elle existe, et on attend que le navigateur
      // notifie l'autre connexion via onversionchange.
      if (_db) { _db.close(); _db = null }
    }
  })
}

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  if (_opening) return _opening

  _opening = doOpen().finally(() => { _opening = null })
  return _opening
}
