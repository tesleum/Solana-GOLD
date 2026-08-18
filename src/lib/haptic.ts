export function triggerHaptic(duration = 15) {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(duration);
    } catch (e) {
      // Ignored if browser restricts it
    }
  }
}
