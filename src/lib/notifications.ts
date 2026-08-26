// Notifications helper

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const showPushNotification = (
  senderName: string,
  messageText: string,
  hidePreview = false,
  partnerPhotoUrl?: string | null
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = senderName;
  const body = hidePreview ? 'Sent a private message' : messageText;

  try {
    const notification = new Notification(title, {
      body,
      icon: partnerPhotoUrl || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'two-private-msg',
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 6000);
  } catch (e) {
    // ignore
  }
};
