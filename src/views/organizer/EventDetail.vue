<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Copy01Icon,
  ExternalLinkIcon,
  PlusSignIcon,
  Settings02Icon,
  ArrowLeft02Icon,
  Calculator01Icon,
  InfinityIcon,
  // --- TAMBAHAN IKON UNTUK EDIT & HAPUS ---
  PencilEdit01Icon,
  Tv01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";
import SlideOver from "../../components/ui/SlideOver.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
// --- TAMBAHAN KOMPONEN DIALOG ---
import ConfirmationDialog from "../../components/ui/ConfirmationDialog.vue";
import {
  currentEvent,
  eventServices,
  getQueueByServiceId,
  getQueueStatusBadgeClass,
  getQueueStatusLabel,
  addServiceToEvent,
  subscribeToServiceUpdate,
  loadOrganizerState,
  type QuotaType,
  updateService,
  deleteService,
  type Service,
  switchActiveService,
  initSyncChannel,
} from "../../data/appStore.ts";
import {
  getEventStatusBadgeClass,
  getEventStatusDotClass,
  getEventStatusLabel,
} from "../../utils/eventStatus";
import { useToast } from "../../composables/useToast";
import { useRouter } from "vue-router";
import { organizerAccount } from "../../data/modules/accountStore";

interface ServiceFormState {
  name: string;
  prefix: string;
  quotaType: QuotaType;
  quotaLimit: number | string; // Diperlebar agar aman dari return value HTML input
}

const isServiceSlideOpen = ref(false);
const toast = useToast();
const eventSettingsPath = computed(
  () => `/events/${currentEvent.value.id}/settings`,
);
const publicRegistrationPath = computed(
  () => `/p/${currentEvent.value.id}/join`,
);
const publicRegistrationUrl = computed(() => {
  if (typeof window === "undefined") return publicRegistrationPath.value;
  return `${window.location.origin}${publicRegistrationPath.value}`;
});

const emptyFormState = (): ServiceFormState => ({
  name: "",
  prefix: "",
  quotaType: "unlimited",
  quotaLimit: "", // Kosongkan string untuk UX input yang lebih bersih
});

const formService = ref<ServiceFormState>(emptyFormState());
const router = useRouter();

const handleGoToOperator = async (serviceId: number) => {
  try {
    // 1. Pastikan jalur komunikasi realtime (Broadcast) sudah terbuka di background
    if (organizerAccount.value?.id) {
      initSyncChannel(organizerAccount.value.id);
    }

    // 2. Tembakkan sinyal ke PublicDisplay agar langsung ganti layanan (Transisi Instan)
    await switchActiveService(serviceId);

    // 3. Setelah sinyal terkirim, pindah halaman ke Operator Console
    router.push(
      `/operator/event/${currentEvent.value.id}/service/${serviceId}`,
    );
  } catch (error) {
    toast.error("Gagal berpindah layanan");
    console.error(error);
  }
};

// Validasi Prefix: Mencegah collision nomor antrean
const prefixError = computed(() => {
  const prefix = formService.value.prefix.trim().toLowerCase();
  if (!prefix) return null;

  const isDuplicate = eventServices.value.some(
    (s) => s.prefix.trim().toLowerCase() === prefix,
  );
  return isDuplicate ? "Kode awalan ini sudah dipakai layanan lain" : null;
});

// Validasi Kuota
const quotaError = computed(() => {
  if (
    formService.value.quotaType === "limited" &&
    Number(formService.value.quotaLimit) <= 0
  ) {
    return "Kuota harus lebih dari 0";
  }
  return null;
});

// Penentuan tombol Save
const isFormValid = computed(() => {
  const name = formService.value.name;
  const prefix = formService.value.prefix;
  const type = formService.value.quotaType;
  const limit = Number(formService.value.quotaLimit);

  const hasBasicInfo = name.trim().length > 0 && prefix.trim().length > 0;
  const hasUniquePrefix = !prefixError.value;

  if (!hasBasicInfo || !hasUniquePrefix) return false;
  if (type === "unlimited") return true;
  if (type === "limited") return limit > 0;

  return false;
});

const addService = async () => {
  if (!isFormValid.value) return;

  await addServiceToEvent({
    name: formService.value.name.trim(),
    prefix: formService.value.prefix.trim().toUpperCase(),
    quotaType: formService.value.quotaType,
    quotaLimit: Number(formService.value.quotaLimit) || 0,
  });

  isServiceSlideOpen.value = false;
  formService.value = emptyFormState();
};

const copyRegistrationLink = async () => {
  const text = publicRegistrationUrl.value;

  // 1. Coba pakai Clipboard API modern jika HTTPS & tersedia
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link berhasil disalin!");
      return;
    } catch (err) {
      console.warn("Clipboard API gagal, mencoba metode fallback...", err);
    }
  }

  // 2. Metode Fallback (Legacy) jika HTTPS tidak tersedia atau API gagal
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Pastikan elemen tidak terlihat tapi ada di dokumen
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    // Eksekusi perintah salin tradisional
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      toast.success("Link berhasil disalin!");
    } else {
      throw new Error("Gagal menyalin");
    }
  } catch (err) {
    toast.error("Gagal menyalin", "Gunakan browser modern atau HTTPS.");
  }
};

const formatServiceQuota = (service: (typeof eventServices.value)[number]) => {
  if (service.quotaType === "unlimited") return "Tanpa Batas";

  return `${service.count}/${Number(service.quotaLimit) || 0}`;
};

// Fungsi untuk memperbarui UI saat ada data berubah
// const handleServiceUpdate = (newData: any) => {
//   const index = eventServices.value.findIndex((s) => s.id === newData.id);
//   if (index !== -1) {
//     // Memperbarui array secara reaktif
//     eventServices.value[index] = { ...eventServices.value[index], ...newData };
//   }
// };

// ==========================================
// BLOK TAMBAHAN: STATE & FUNGSI EDIT LAYANAN
// ==========================================
const isEditModalOpen = ref(false);
const serviceToEdit = ref<Service | null>(null);
const isSaving = ref(false);
const formEdit = ref<ServiceFormState>(emptyFormState());

const triggerEdit = (service: Service) => {
  serviceToEdit.value = service;
  formEdit.value = {
    name: service.name,
    prefix: service.prefix,
    quotaType: service.quotaType,
    quotaLimit: service.quotaLimit || "",
  };
  isEditModalOpen.value = true;
};

const handleUpdateService = async () => {
  if (!serviceToEdit.value) return;
  if (!formEdit.value.name.trim() || !formEdit.value.prefix.trim()) {
    toast.error("Nama layanan dan prefix wajib diisi.");
    return;
  }

  try {
    isSaving.value = true;
    await updateService(serviceToEdit.value.id, {
      name: formEdit.value.name.trim(),
      prefix: formEdit.value.prefix.trim().toUpperCase(),
      quota_type: formEdit.value.quotaType,
      quota_limit:
        formEdit.value.quotaType === "limited"
          ? Number(formEdit.value.quotaLimit)
          : null,
    });
    toast.success("Perubahan data layanan berhasil disimpan.");
    isEditModalOpen.value = false;
  } catch (error) {
    toast.error("Gagal memperbarui data layanan.");
  } finally {
    isSaving.value = false;
  }
};

// ==========================================
// BLOK TAMBAHAN: STATE & FUNGSI HAPUS LAYANAN
// ==========================================
const isDeleteDialogOpen = ref(false);
const serviceToDelete = ref<Service | null>(null);

const triggerDelete = (service: Service) => {
  serviceToDelete.value = service;
  isDeleteDialogOpen.value = true;
};

const confirmDeleteService = async () => {
  if (!serviceToDelete.value) return;

  try {
    await deleteService(serviceToDelete.value.id);
    toast.success(`Layanan ${serviceToDelete.value.name} berhasil dihapus.`);
    isDeleteDialogOpen.value = false;
  } catch (error) {
    toast.error("Gagal menghapus layanan. Pastikan koneksi stabil.");
  } finally {
    serviceToDelete.value = null;
  }
};

let unsubscribeService: (() => void) | null = null;

onMounted(() => {
  void loadOrganizerState();
});

// watch immediate: true → langsung jalan jika ID sudah ada,
// atau tunggu sampai SWR selesai mengisinya
watch(
  () => currentEvent.value.id,
  (newId) => {
    unsubscribeService?.(); // bersihkan subscription lama dulu
    if (newId) {
      unsubscribeService = subscribeToServiceUpdate(newId);
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  unsubscribeService?.();
});
</script>

<template>
  <div class="space-y-6">
    <router-link
      to="/events"
      class="text-sm font-medium text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
    >
      <HugeiconsIcon :icon="ArrowLeft02Icon" :size="16" :stroke-width="2" />
      Kembali
    </router-link>

    <div
      class="bg-surface border border-border-subtle p-6 rounded-xl shadow-sm"
    >
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-heading font-bold text-text-main">
            {{ currentEvent.title }}
          </h1>
          <span class="mt-2 inline-flex items-center gap-2 text-text-muted">
            {{ currentEvent.date }}
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
              :class="getEventStatusBadgeClass(currentEvent.status)"
            >
              <span class="relative flex h-2 w-2">
                <span
                  v-if="currentEvent.status === 'live'"
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
                ></span>
                <span
                  class="relative inline-flex rounded-full h-2 w-2"
                  :class="getEventStatusDotClass(currentEvent.status)"
                ></span>
              </span>
              {{ getEventStatusLabel(currentEvent.status) }}
            </span>
          </span>
        </div>
        <div class="flex items-center gap-1">
          <router-link
            :to="`/tv/${currentEvent.id}`"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-primary bg-brand-primary-light hover:bg-brand-primary hover:text-white border border-brand-primary/30 rounded-lg transition-colors"
            aria-label="Buka Display TV"
            title="Buka Display TV"
            target="_blank"
          >
            <HugeiconsIcon :icon="Tv01Icon" :size="14" :stroke-width="2" />
            Display TV
          </router-link>

          <router-link
            :to="eventSettingsPath"
            class="p-2 text-text-muted hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Pengaturan kegiatan"
            title="Pengaturan kegiatan"
          >
            <HugeiconsIcon
              :icon="Settings02Icon"
              :size="20"
              :stroke-width="2"
            />
          </router-link>
        </div>
      </div>
    </div>

    <div
      class="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm"
    >
      <div
        class="px-6 py-4 border-b border-border-subtle flex flex-col gap-3 bg-gray-50/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <h2 class="font-heading font-semibold text-text-main">
            Pendaftaran Peserta
          </h2>
          <p class="mt-1 text-sm text-text-muted">
            Bagikan link ini agar peserta bisa mengambil nomor antrean.
          </p>
        </div>
        <span
          class="inline-flex w-fit items-center gap-1.5 rounded-md border border-brand-primary/20 bg-brand-primary-light px-2.5 py-1 text-xs font-semibold text-brand-primary"
        >
          Link Publik
        </span>
      </div>

      <div class="p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            class="min-w-0 flex-1 rounded-lg border border-border-subtle bg-gray-50 px-3 py-2 font-mono text-sm text-text-muted"
          >
            <p class="truncate">{{ publicRegistrationUrl }}</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <a
              :href="publicRegistrationPath"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-main transition-colors tactile-btn hover:border-brand-primary hover:bg-brand-primary-light hover:text-brand-primary"
            >
              <HugeiconsIcon
                :icon="ExternalLinkIcon"
                :size="16"
                :stroke-width="2"
              />
              Buka Pendaftaran
            </a>
            <button
              type="button"
              @click="copyRegistrationLink"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors tactile-btn hover:bg-brand-primary-hover"
            >
              <HugeiconsIcon :icon="Copy01Icon" :size="16" :stroke-width="2" />
              Salin Link
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm"
    >
      <div
        class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-gray-50/50"
      >
        <h2 class="font-heading font-semibold text-text-main">
          Daftar Layanan
        </h2>
        <button
          type="button"
          @click="isServiceSlideOpen = true"
          class="bg-brand-primary hover:bg-brand-primary-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 tactile-btn transition-colors"
        >
          <HugeiconsIcon :icon="PlusSignIcon" :size="16" :stroke-width="2" />
          Tambah Layanan
        </button>
      </div>

      <table class="w-full text-left">
        <thead class="text-xs text-text-muted border-b border-border-subtle">
          <tr>
            <th class="px-6 py-3 font-medium">Nama Layanan</th>
            <th class="px-6 py-3 font-medium">Kode Awalan</th>
            <th class="px-6 py-3 font-medium">Kuota</th>
            <th class="px-6 py-3 font-medium">Status Layanan</th>
            <th class="px-6 py-3 font-medium text-right">Antrean Saat Ini</th>
            <th class="px-6 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="text-sm divide-y divide-border-subtle">
          <tr
            v-for="s in eventServices"
            :key="s.id"
            class="hover:bg-gray-50/50 transition-colors"
          >
            <td class="px-6 py-4 font-medium text-text-main">{{ s.name }}</td>
            <td class="px-6 py-4">
              <span
                class="font-mono text-brand-primary font-bold bg-brand-primary-light px-2 py-1 rounded"
              >
                {{ s.prefix }}
              </span>
            </td>
            <td class="px-6 py-4 text-text-muted">
              {{ formatServiceQuota(s) }}
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
                :class="
                  getQueueStatusBadgeClass(getQueueByServiceId(s.id).status)
                "
              >
                {{ getQueueStatusLabel(getQueueByServiceId(s.id).status) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right text-text-muted">{{ s.count }}</td>
            <td
              class="px-6 py-4 text-right flex items-center justify-end gap-2"
            >
              <button
                @click.prevent="handleGoToOperator(s.id)"
                class="inline-flex items-center justify-center rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-sm font-medium text-text-main hover:border-brand-primary hover:bg-brand-primary-light hover:text-brand-primary tactile-btn transition-colors"
              >
                Ke Pemanggilan
              </button>
              <RouterLink
                :key="s.id"
                :to="`/events/${currentEvent.id}/service/${s.id}`"
              >
                <button
                  @click.prevent="triggerEdit(s)"
                  class="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary-light rounded-lg transition-colors border border-transparent"
                  title="Edit Layanan"
                >
                  <HugeiconsIcon :icon="PencilEdit01Icon" :size="20" />
                </button>

                <button
                  @click.prevent="triggerDelete(s)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                  title="Hapus Layanan"
                >
                  <HugeiconsIcon :icon="Delete01Icon" :size="20" />
                </button>
              </RouterLink>
            </td>
          </tr>
          <tr v-if="eventServices.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-text-muted">
              Belum ada layanan untuk kegiatan ini.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <SlideOver
      :isOpen="isServiceSlideOpen"
      title="Tambah Layanan Baru"
      @close="isServiceSlideOpen = false"
    >
      <div class="space-y-5">
        <BaseInput
          v-model="formService.name"
          label="Nama Layanan"
          placeholder="Contoh: Meja Registrasi"
        />

        <BaseInput
          v-model="formService.prefix"
          label="Kode Awalan"
          placeholder="Contoh: R"
          :maxlength="3"
          uppercase
          :error="prefixError"
        />

        <div>
          <label class="block text-sm font-medium text-text-main mb-2"
            >Konfigurasi Kuota</label
          >
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :aria-pressed="formService.quotaType === 'unlimited'"
              @click="formService.quotaType = 'unlimited'"
              :class="[
                'p-3 rounded-lg border text-sm transition-all',
                formService.quotaType === 'unlimited'
                  ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                  : 'border-border-subtle hover:bg-gray-50 text-text-muted',
              ]"
            >
              <div class="flex flex-col items-center gap-1 font-medium">
                <HugeiconsIcon :icon="InfinityIcon" :size="20" /> Tanpa Batas
              </div>
            </button>

            <button
              type="button"
              :aria-pressed="formService.quotaType === 'limited'"
              @click="formService.quotaType = 'limited'"
              :class="[
                'p-3 rounded-lg border text-sm transition-all',
                formService.quotaType === 'limited'
                  ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                  : 'border-border-subtle hover:bg-gray-50 text-text-muted',
              ]"
            >
              <div class="flex flex-col items-center gap-1 font-medium">
                <HugeiconsIcon :icon="Calculator01Icon" :size="20" /> Terbatas
              </div>
            </button>
          </div>

          <div
            v-if="formService.quotaType === 'limited'"
            class="mt-4 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <BaseInput
              v-model="formService.quotaLimit"
              type="number"
              :min="1"
              label="Jumlah Maksimal Peserta"
              placeholder="0"
              :error="quotaError"
            />
          </div>
        </div>

        <button
          type="button"
          @click="addService"
          :disabled="!isFormValid"
          class="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-2.5 rounded-lg font-medium tactile-btn mt-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Simpan Layanan
        </button>
      </div>
    </SlideOver>
  </div>

  <SlideOver
    :is-open="isEditModalOpen"
    title="Edit Data Layanan"
    @close="isEditModalOpen = false"
  >
    <div class="space-y-5">
      <BaseInput
        v-model="formEdit.name"
        label="Nama Layanan"
        placeholder="Cth: Poli Umum, Meja 1, dll"
      />

      <BaseInput
        v-model="formEdit.prefix"
        label="Kode Awalan"
        placeholder="Contoh: R"
        :maxlength="3"
        uppercase
        :error="prefixError"
      />

      <div>
        <label class="block text-sm font-medium text-text-main mb-2">
          Tipe Kuota Pendaftaran
        </label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="formEdit.quotaType = 'unlimited'"
            :class="[
              'p-3 rounded-lg border text-sm transition-all',
              formEdit.quotaType === 'unlimited'
                ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                : 'border-border-subtle hover:bg-gray-50 text-text-muted',
            ]"
          >
            <div class="flex flex-col items-center gap-1 font-medium">
              <HugeiconsIcon :icon="InfinityIcon" :size="20" /> Tanpa Batas
            </div>
          </button>

          <button
            type="button"
            @click="formEdit.quotaType = 'limited'"
            :class="[
              'p-3 rounded-lg border text-sm transition-all',
              formEdit.quotaType === 'limited'
                ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                : 'border-border-subtle hover:bg-gray-50 text-text-muted',
            ]"
          >
            <div class="flex flex-col items-center gap-1 font-medium">
              <HugeiconsIcon :icon="Calculator01Icon" :size="20" /> Terbatas
            </div>
          </button>
        </div>

        <div
          v-if="formEdit.quotaType === 'limited'"
          class="mt-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <BaseInput
            v-model="formEdit.quotaLimit"
            type="number"
            :min="1"
            label="Jumlah Maksimal Peserta"
            placeholder="0"
          />
        </div>
      </div>

      <button
        type="button"
        @click="handleUpdateService"
        :disabled="isSaving"
        class="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-2.5 rounded-lg font-medium tactile-btn mt-4 disabled:opacity-50 flex justify-center"
      >
        <span v-if="isSaving" class="flex items-center gap-2">
          <svg
            class="animate-spin h-5 w-5 text-white"
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
          Menyimpan...
        </span>
        <span v-else>Simpan Perubahan</span>
      </button>
    </div>
  </SlideOver>

  <ConfirmationDialog
    :is-open="isDeleteDialogOpen"
    :title="`Hapus Layanan ${serviceToDelete?.name}?`"
    :description="`PERINGATAN: Menghapus layanan ini akan menghapus PERMANEN seluruh tiket pendaftar dan antrean yang sedang berjalan. Tindakan ini tidak bisa dibatalkan.`"
    confirm-label="Ya, Hapus Semua Data"
    @confirm="confirmDeleteService"
    @close="isDeleteDialogOpen = false"
  />
</template>
