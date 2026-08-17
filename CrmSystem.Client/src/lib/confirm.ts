export const confirmAction = (message: string): Promise<boolean> => {
  const isDeletion = message.toLowerCase().includes('delete') || 
                     message.toLowerCase().includes('remove') || 
                     message.toLowerCase().includes('clear');
                     
  if (!isDeletion) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const event = new CustomEvent('app:confirm', {
      detail: { message, resolve }
    });
    window.dispatchEvent(event);
  });
};
