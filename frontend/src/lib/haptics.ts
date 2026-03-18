/** Haptic feedback patterns for mobile devices using the Vibration API */
export const haptic = {
  /** Light tap — button press, toggle */
  light: () => navigator?.vibrate?.(10),
  /** Medium tap — confirmation, selection */
  medium: () => navigator?.vibrate?.(25),
  /** Heavy tap — error, important action */
  heavy: () => navigator?.vibrate?.(50),
  /** Double pulse — notification, alert */
  double: () => navigator?.vibrate?.([20, 50, 20]),
}
