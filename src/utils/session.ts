/** Keys that must survive signing out (they are about the device, not the user). */
const KEEP_ON_LOGOUT = ['install_dismissed_at']

/** Clears the signed-in session from localStorage but keeps device-level settings. */
export function clearSession() {
  const kept = KEEP_ON_LOGOUT.map((k) => [k, localStorage.getItem(k)] as const)
  localStorage.clear()
  kept.forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v) })
}
