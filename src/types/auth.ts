export interface AuthUserRecord {
  username: string        // keyPath (inline) — normalisé en minuscules
  passwordHash: string    // base64url — PBKDF2-SHA-256
  salt: string            // base64url — 16 octets aléatoires pour hashPassword
  encryptedData: string   // base64url — AES-GCM (profil utilisateur JSON)
  iv: string              // base64url — 12 octets IV pour AES-GCM
  encSalt: string         // base64url — 16 octets salt séparé pour dériver la clé AES
  createdAt: number
  updatedAt: number
}

export interface AuthSession {
  username: string
  createdAt: number
}

export interface AuthUser {
  username: string
  createdAt: number
}
