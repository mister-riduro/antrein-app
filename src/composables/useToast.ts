import { ref } from "vue";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: number;
  description?: string;
  title: string;
  type: ToastType;
}

interface ToastInput {
  description?: string;
  timeoutMs?: number;
  title: string;
  type?: ToastType;
}

const toasts = ref<ToastMessage[]>([]);
let toastId = 0;

const removeToast = (id: number) => {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
};

const showToast = ({
  description,
  timeoutMs = 4500,
  title,
  type = "info",
}: ToastInput) => {
  const id = ++toastId;

  toasts.value.push({
    description,
    id,
    title,
    type,
  });

  window.setTimeout(() => removeToast(id), timeoutMs);
};

export const useToast = () => {
  return {
    error: (title: string, description?: string) =>
      showToast({ description, title, type: "error" }),
    info: (title: string, description?: string) =>
      showToast({ description, title, type: "info" }),
    removeToast,
    showToast,
    success: (title: string, description?: string) =>
      showToast({ description, title, type: "success" }),
    toasts,
    warning: (title: string, description?: string) =>
      showToast({ description, title, type: "warning" }),
  };
};
