<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import { AlertCircleIcon, Cancel01Icon } from "@hugeicons/core-free-icons";

type DialogVariant = "danger" | "primary";

const props = withDefaults(
  defineProps<{
    cancelLabel?: string;
    confirmLabel?: string;
    description: string;
    isOpen: boolean;
    title: string;
    variant?: DialogVariant;
  }>(),
  {
    cancelLabel: "Batal",
    confirmLabel: "Konfirmasi",
    variant: "primary",
  },
);

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const titleId = "confirmation-dialog-title";

const close = () => {
  emit("close");
};

const confirm = () => {
  emit("confirm");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    close();
  }
};

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeydown);
      document.body.style.overflow = "hidden";
      return;
    }

    document.removeEventListener("keydown", handleKeydown);
    document.body.style.overflow = "";
  },
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Tutup dialog konfirmasi"
        @click="close"
      ></button>

      <section
        class="relative w-full max-w-md rounded-xl border border-border-subtle bg-white p-5 shadow-xl"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="
              variant === 'danger'
                ? 'bg-red-50 text-red-600'
                : 'bg-brand-primary-light text-brand-primary'
            "
          >
            <HugeiconsIcon
              :icon="AlertCircleIcon"
              :size="22"
              :stroke-width="2"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <h2
                :id="titleId"
                class="font-heading text-lg font-bold text-text-main"
              >
                {{ title }}
              </h2>
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main"
                aria-label="Tutup dialog"
                @click="close"
              >
                <HugeiconsIcon
                  :icon="Cancel01Icon"
                  :size="18"
                  :stroke-width="2"
                />
              </button>
            </div>

            <p class="mt-2 text-sm leading-6 text-text-muted">
              {{ description }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-main transition-colors tactile-btn hover:bg-gray-50"
            @click="close"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors tactile-btn"
            :class="
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand-primary hover:bg-brand-primary-hover'
            "
            @click="confirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
