import * as Haptics from "expo-haptics";

export const haptics = {
  /** Light tap — toggle, select */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium tap — button press, navigation */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Heavy tap — important action completed */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /** Success — form submit, booking confirmed */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Error — validation fail, request error */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Warning — destructive action prompt */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  /** Selection change — picker, tab switch */
  selection: () => Haptics.selectionAsync(),
};
