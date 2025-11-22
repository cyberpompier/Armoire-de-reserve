import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  return toast.success(message);
};

export const showError = (message: string) => {
  return toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};