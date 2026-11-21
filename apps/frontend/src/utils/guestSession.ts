const GUEST_SESSION_KEY = 'lf_guest_mode_active';

/** Menandai sesi Mode Tamu aktif agar pengguna tidak terlempar kembali ke layar pemilihan peran (/). */
export function setGuestModeActive(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(GUEST_SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
}

export function isGuestModeActive(): boolean {
  try {
    return sessionStorage.getItem(GUEST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
