// Utilitaires cryptographiques — Web Crypto API native, aucune dépendance externe
// PBKDF2-SHA-256 (200 000 itérations) + AES-GCM 256-bit

// --- Helpers base64url ---

export function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function base64urlToBuf(s: string): ArrayBuffer {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    s.length + (4 - (s.length % 4)) % 4, '='
  )
  const binary = atob(padded)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer as ArrayBuffer
}

// --- Génération de nombres aléatoires ---

export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
}

export function generateIV(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>
}

// --- Dérivation de clé PBKDF2 ---

async function deriveRawKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200_000 },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  )
}

// --- Hash du mot de passe (pour comparaison à la connexion) ---

export async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200_000 },
    baseKey,
    256
  )
  return bufToBase64url(bits)
}

// --- Chiffrement AES-GCM ---

export async function encryptJSON(data: unknown, password: string): Promise<{
  ciphertext: string
  iv: string
  encSalt: string
}> {
  const iv = generateIV()
  const encSalt = generateSalt()
  const key = await deriveRawKey(password, encSalt, ['encrypt'])
  const enc = new TextEncoder()
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  )
  return {
    ciphertext: bufToBase64url(cipherBuf),
    iv: bufToBase64url(iv.buffer),
    encSalt: bufToBase64url(encSalt.buffer),
  }
}

export async function decryptJSON(
  ciphertext: string,
  iv: string,
  encSalt: string,
  password: string
): Promise<unknown> {
  const key = await deriveRawKey(
    password,
    new Uint8Array(base64urlToBuf(encSalt)) as Uint8Array<ArrayBuffer>,
    ['decrypt']
  )
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64urlToBuf(iv)) as Uint8Array<ArrayBuffer> },
    key,
    base64urlToBuf(ciphertext)
  )
  const dec = new TextDecoder()
  return JSON.parse(dec.decode(plainBuf))
}

// --- Comparaison en temps constant (prévention timing attacks) ---

export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}
