<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseInput from "../../components/ui/BaseInput.vue";
import { createEvent } from "../../data/appStore";
import { useToast } from "../../composables/useToast";

const router = useRouter();
const toast = useToast();
const form = ref({
  name: "",
  date: "",
  description: "",
});
const isSubmitting = ref(false);

const handleSave = async () => {
  isSubmitting.value = true;
  try {
    const event = await createEvent({
      date: form.value.date,
      description: form.value.description,
      title: form.value.name,
    });
    toast.success(
      "Kegiatan dibuat",
      "Kegiatan baru sudah tersimpan ke database.",
    );
    router.push(`/events/${event.id}`);
  } catch {
    toast.error("Gagal membuat kegiatan", "Periksa data lalu coba lagi.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <button
      type="button"
      @click="router.back()"
      class="text-sm font-medium text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Kembali ke Daftar Kegiatan
    </button>

    <div>
      <h1 class="text-2xl font-bold text-text-main tracking-tight">
        Buat Kegiatan Baru
      </h1>
      <p class="text-text-muted text-sm mt-1">
        Atur detail dasar untuk kegiatan antrean Anda.
      </p>
    </div>

    <div
      class="bg-surface border border-border-subtle rounded-xl shadow-sm p-6 sm:p-8"
    >
      <form @submit.prevent="handleSave" class="space-y-6">
        <BaseInput
          v-model="form.name"
          label="Nama Kegiatan"
          required
          placeholder="Contoh: Khitanan Massal 2026"
        />

        <BaseInput
          v-model="form.date"
          type="date"
          label="Tanggal Pelaksanaan"
          required
        />

        <div>
          <label
            for="event-description"
            class="block text-sm font-medium text-text-main mb-1.5"
            >Deskripsi Internal
            <span class="text-gray-400 font-normal">(Opsional)</span></label
          >
          <textarea
            id="event-description"
            v-model="form.description"
            rows="3"
            placeholder="Catatan kecil untuk tim panitia..."
            class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all resize-none"
          ></textarea>
        </div>

        <div class="pt-4 border-t border-border-subtle flex justify-end gap-3">
          <button
            type="button"
            @click="router.back()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 tactile-btn"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover rounded-md shadow-sm tactile-btn flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg
              v-if="isSubmitting"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Simpan dan Lanjutkan
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
