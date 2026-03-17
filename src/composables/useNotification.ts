// Sonnerie et notification navigateur à la fin d'un timer

function jouerSonnerie() {
  try {
    const ctx = new AudioContext()
    const playBeep = (startTime: number, frequency: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, startTime)
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    const now = ctx.currentTime
    playBeep(now, 880, 0.2)
    playBeep(now + 0.25, 1100, 0.2)
    playBeep(now + 0.5, 880, 0.4)
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Web Audio API non supportée
  }
}

async function demanderPermissionNotification(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function initialiserNotifications() {
  await demanderPermissionNotification()
}

export function notifierFinTimer(enclosId: number) {
  jouerSonnerie()
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏰ Enclos ${enclosId} — Timer terminé !`, {
      body: 'Le timer de cet enclos est arrivé à terme.',
      icon: '/favicon.ico',
      tag: `timer-enclos-${enclosId}`,
    })
  }
}

export function notifierObjectifAtteint(enclosId: number, jaugeNom: string) {
  jouerSonnerie()
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`✅ Enclos ${enclosId} — ${jaugeNom} atteint !`, {
      body: `L'objectif de la jauge ${jaugeNom} est atteint.`,
      icon: '/favicon.ico',
      tag: `objectif-enclos-${enclosId}-${jaugeNom}`,
    })
  }
}
