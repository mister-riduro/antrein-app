<script setup lang="ts">
import { reactive, computed } from "vue";
import { RouterLink } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import BaseInput from "../../components/ui/BaseInput.vue";
import {
  currentEvent,
  eventStatusOptions,
  updateCurrentEvent,
  type EventStatus,
} from "../../data/appStore.ts";
import { useToast } from "../../composables/useToast";

interface EventSettingsForm {
  date: string;
  description: string;
  status: EventStatus;
  title: string;
}

const toast = useToast();

const form = reactive<EventSettingsForm>({
  date: currentEvent.value.date,
  description: "",
  status: currentEvent.value.status,
  title: currentEvent.value.title,
});

const eventDetailPath = computed(() => `/events/${currentEvent.value.id}`);

const titleError = computed(() => {
  return form.title.trim().length === 0 ? "Nama kegiatan wajib diisi" : null;
});

const dateError = computed(() => {
  return form.date.trim().length === 0 ? "Tanggal kegiatan wajib diisi" : null;
});

const isFormValid = computed(() => !titleError.value && !dateError.value);

const saveSettings = async () => {
  if (!isFormValid.value) {
    toast.error(
      "Pengaturan belum bisa disimpan",
      "Lengkapi nama dan tanggal kegiatan terlebih dahulu.",
    );
    return;
  }

  try {
    await updateCurrentEvent({
      date: form.date.trim(),
      status: form.status,
      title: form.title.trim(),
    });

    toast.success(
      "Pengaturan kegiatan disimpan",
      "Perubahan nama, tanggal, dan status kegiatan sudah diperbarui.",
    );
  } catch {
    toast.error(
      "Gagal menyimpan pengaturan",
      "Perubahan belum tersimpan ke database.",
    );
  }
};
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <RouterLink
      :to="eventDetailPath"
      class="text-sm font-medium text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
    >
      <HugeiconsIcon :icon="ArrowLeft02Icon" :size="16" :stroke-width="2" />
      Kembali ke Detail Kegiatan
    </RouterLink>

    <div>
      <h1 class="text-2xl font-bold text-text-main tracking-tight">
        Pengaturan Kegiatan
      </h1>
      <p class="text-text-muted text-sm mt-1">
        Kelola informasi dasar dan status kegiatan antrean.
      </p>
    </div>

    <section
      class="bg-surface border border-border-subtle rounded-xl shadow-sm p-6 sm:p-8"
    >
      <form class="space-y-6" @submit.prevent="saveSettings">
        <BaseInput
          v-model="form.title"
          label="Nama Kegiatan"
          placeholder="Contoh: Khitanan Massal Sidoarjo"
          :error="titleError"
        />

        <BaseInput
          v-model="form.date"
          label="Tanggal Kegiatan"
          placeholder="Contoh: 20 Juni 2026"
          :error="dateError"
        />

        <div>
          <label class="block text-sm font-medium text-text-main mb-2">
            Status Kegiatan
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="status in eventStatusOptions"
              :key="status.value"
              type="button"
              :aria-pressed="form.status === status.value"
              @click="form.status = status.value"
              class="rounded-lg border px-4 py-3 text-sm font-medium transition-colors"
              :class="
                form.status === status.value
                  ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                  : 'border-border-subtle bg-white text-text-muted hover:bg-gray-50'
              "
            >
              {{ status.label }}
            </button>
          </div>
        </div>

        <div>
          <label
            for="event-settings-description"
            class="block text-sm font-medium text-text-main mb-1.5"
          >
            Catatan Internal
            <span class="text-gray-400 font-normal">(Opsional)</span>
          </label>
          <textarea
            id="event-settings-description"
            v-model="form.description"
            rows="4"
            placeholder="Catatan untuk panitia atau operator..."
            class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all resize-none"
          ></textarea>
        </div>

        <div class="pt-4 border-t border-border-subtle flex justify-end gap-3">
          <RouterLink
            :to="eventDetailPath"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 tactile-btn"
          >
            Batal
          </RouterLink>
          <button
            type="submit"
            :disabled="!isFormValid"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover rounded-md shadow-sm tactile-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
