<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Cancel01Icon,
  HelpCircleIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const whatsappUrl = "https://wa.me/6282257047836";
const titleId = "help-dialog-title";

const close = () => {
  emit("close");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") close();
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
        aria-label="Tutup dialog bantuan"
        @click="close"
      ></button>

      <section
        class="relative w-full max-w-md rounded-xl border border-border-subtle bg-white p-5 shadow-xl"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary"
            >
              <HugeiconsIcon
                :icon="HelpCircleIcon"
                :size="22"
                :stroke-width="2"
              />
            </div>
            <div>
              <h2
                :id="titleId"
                class="font-heading text-lg font-bold text-text-main"
              >
                Bantuan
              </h2>
              <p class="mt-2 text-sm leading-6 text-text-muted">
                Butuh bantuan konfigurasi kegiatan, audio pemanggilan, atau
                operasional antrean? Hubungi admin melalui WhatsApp.
              </p>
            </div>
          </div>

          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main"
            aria-label="Tutup dialog"
            @click="close"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="18" :stroke-width="2" />
          </button>
        </div>

        <div
          class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-main transition-colors tactile-btn hover:bg-gray-50"
            @click="close"
          >
            Tutup
          </button>
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors tactile-btn hover:bg-green-700"
          >
            <HugeiconsIcon :icon="WhatsappIcon" :size="18" :stroke-width="2" />
            Hubungi WhatsApp Admin
          </a>
        </div>
      </section>
    </div>
  </Teleport>
</template>
