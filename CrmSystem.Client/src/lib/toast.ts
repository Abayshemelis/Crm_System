export type ToastType = 'success' | 'error';

export const showToast = (message: string, type: ToastType = 'success') => {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
};
