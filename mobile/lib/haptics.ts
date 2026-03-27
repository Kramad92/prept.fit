import * as Haptics from "expo-haptics";

export const haptics = {
  /** Light tap — toggle, select */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),

  /** Medium tap — button press, navigation */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),

  /** Heavy tap — important action completed */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),

  /** Success — form submit, booking confirmed */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),

  /** Error — validation fail, request error */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),

  /** Warning — destructive action prompt */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),

  /** Selection change — picker, tab switch */
  selection: () => Haptics.selectionAsync().catch(() => {}),
};
