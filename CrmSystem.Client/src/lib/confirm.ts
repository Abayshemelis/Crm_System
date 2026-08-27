export interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

export const confirmAction = (message: string, options?: ConfirmOptions): Promise<boolean> => {
  const lowerMsg = message.toLowerCase();
  const requiresConfirm = lowerMsg.includes('delete') || 
                          lowerMsg.includes('remove') || 
                          lowerMsg.includes('clear') ||
                          lowerMsg.includes('logout') ||
                          lowerMsg.includes('log out') ||
                          lowerMsg.includes('sign out');
                     
  if (!requiresConfirm) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const event = new CustomEvent('app:confirm', {
      detail: { message, resolve, options }
    });
    window.dispatchEvent(event);
  });
};
