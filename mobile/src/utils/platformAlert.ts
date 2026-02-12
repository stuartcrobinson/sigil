/**
 * Cross-platform alert replacement.
 * Uses window.confirm/alert on web (where RN Alert.alert is a no-op).
 * Delegates to Alert.alert on native platforms.
 */
import { Platform, Alert } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
      if (confirmed) {
        const actionButton = buttons.find(b => b.style !== 'cancel');
        actionButton?.onPress?.();
      } else {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
      }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      if (buttons && buttons.length === 1) {
        buttons[0]?.onPress?.();
      }
    }
  } else if (buttons) {
    Alert.alert(title, message, buttons);
  } else {
    Alert.alert(title, message);
  }
}
