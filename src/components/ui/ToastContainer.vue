<script setup lang="ts">
import { useToast, type ToastType } from "../../composables/useToast";

const { removeToast, toasts } = useToast();

const toastClasses: Record<ToastType, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const dotClasses: Record<ToastType, string> = {
  error: "bg-red-500",
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
};
</script>

<template>
  <div
    class="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3"
    aria-live="polite"
    aria-relevant="additions"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        class="rounded-lg border px-4 py-3 shadow-lg"
        :class="toastClasses[toast.type]"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            :class="dotClasses[toast.type]"
          ></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p v-if="toast.description" class="mt-1 text-sm opacity-90">
              {{ toast.description }}
            </p>
          </div>
          <button
            type="button"
            class="rounded px-1.5 text-lg leading-none opacity-60 transition-opacity hover:opacity-100"
            aria-label="Tutup notifikasi"
            @click="removeToast(toast.id)"
          >
            &times;
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
