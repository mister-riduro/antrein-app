<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  VolumeHighIcon,
  CheckmarkCircle02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Logout02Icon,
  UserGroupIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

// Impor state dan actions dari store aplikasi
import {
  currentEvent,
  assignedService,
  eventServices,
  servicePointConfig,
  servicePointName,
  getQueueByServiceId,
  getQueueStatusBadgeClass,
  getQueueStatusDotClass,
  getQueueStatusLabel,
  loadOrganizerState,
  callNextNumber,
  closeCounter,
  finishServingNumber,
  openCounter,
  recallNumber,
  skipServingNumber,
  subscribeToServiceQueue,
  selectedServiceId,
  switchActiveService,
  initSyncChannel,
  organizerAccount,
  subscribeToAllEventTickets,
} from "../../data/appStore.ts";
import { useToast } from "../../composables/useToast.ts";
import { useAnnouncementDiagnostics } from "../../composables/useAnnouncementDiagnostics.ts";
import ConfirmationDialog from "../../components/ui/ConfirmationDialog.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isCloseCounterDialogOpen = ref(false);

const eventDetailPath = computed(() => `/events/${currentEvent.value.id}`);
const serviceId = computed(() => Number(route.params.serviceId));
const activeService = computed(() =>
  eventServices.value.find((service) => service.id === serviceId.value),
);
const isServiceFound = computed(() => Boolean(activeService.value));
const activeServiceId = computed(
  () => activeService.value?.id ?? assignedService.value.id,
);
const activeServiceName = computed(
  () => activeService.value?.name || assignedService.value.name,
);
const activeQueue = computed(() => getQueueByServiceId(activeServiceId.value));
const formatAnnouncementNumber = ({
  currentNumber,
  serviceId,
}: {
  currentNumber: number;
  serviceId: number;
}) => {
  const service = eventServices.value.find((item) => item.id === serviceId);
  const prefix = service?.prefix || activeService.value?.prefix || "";
  const paddedNumber = currentNumber.toString().padStart(3, "0");

  return prefix ? `${prefix}-${paddedNumber}` : paddedNumber;
};
const {
  subscribeToService: subscribeToAnnouncementService,
  trackAnnouncement,
} = useAnnouncementDiagnostics(formatAnnouncementNumber);
const isActiveQueueClosed = computed(
  () => activeQueue.value.status === "closed",
);
const switchService = async (serviceId: number) => {
  selectedServiceId.value = serviceId; // ← ini yang trigger watch di PublicDisplay
  try {
    await switchActiveService(serviceId);
  } catch (err) {
    console.error("Gagal pindah layanan aktif:", err);
    toast.error(
      "Gagal Pindah Layanan",
      "Tidak bisa mengubah layanan aktif. Periksa koneksi dan coba lagi.",
    );
    return; // jangan lanjut navigasi kalau update DB-nya gagal
  }
  router.push(`/operator/event/${currentEvent.value.id}/service/${serviceId}`);
};

const unsubscribeFns: Array<() => void> = [];
let unsubscribeAllTickets: (() => void) | null = null;

onMounted(async () => {
  await loadOrganizerState();
  eventServices.value.forEach((service) => {
    subscribeToAnnouncementService(service.id);
  });

  if (activeServiceId.value) {
    unsubscribeFns.push(subscribeToServiceQueue(activeServiceId.value));
    // unsubscribeFns.push(subscribeToTicketInserts(activeServiceId.value));
  }
  if (organizerAccount.value.id) {
    initSyncChannel(organizerAccount.value.id);
  }
  if (currentEvent.value && currentEvent.value.id) {
    // Jalankan SATU subscription untuk mendengarkan seluruh tiket di event ini
    unsubscribeAllTickets = subscribeToAllEventTickets(currentEvent.value.id);
  }
});
onUnmounted(() => {
  // Memutus koneksi channel Supabase saat operator keluar dari halaman agar tidak memicu memory leak
  unsubscribeFns.forEach((fn) => fn());
  unsubscribeFns.length = 0; // Kosongkan array
  if (unsubscribeAllTickets) {
    unsubscribeAllTickets();
  }
});

const formatQueueNumber = (serviceId: number, prefix: string) => {
  const queue = getQueueByServiceId(serviceId);
  const num = queue.currentNumber.toString().padStart(3, "0");
  return `${prefix}-${num}`;
};

const handleCallNextNumber = async () => {
  // Tambahkan pelindung isProcessing.value
  if (isActiveQueueClosed.value || isProcessing.value) return;

  try {
    isProcessing.value = true; // Kunci tombol
    await callNextNumber(activeServiceId.value);
    trackAnnouncement(activeServiceId.value, activeQueue.value.currentNumber);
  } finally {
    isProcessing.value = false; // Buka kembali tombol
  }
};

const handleRecallNumber = async () => {
  if (isActiveQueueClosed.value || isProcessing.value) return;

  try {
    isProcessing.value = true;
    await recallNumber(activeServiceId.value);
    trackAnnouncement(activeServiceId.value, activeQueue.value.currentNumber);
  } finally {
    isProcessing.value = false;
  }
};

const handleFinishServingNumber = async () => {
  if (isProcessing.value) return;

  try {
    isProcessing.value = true;
    await finishServingNumber(activeServiceId.value);
    toast.success(
      "Selesai Dilayani",
      `Nomor ${formattedCurrentNumber.value} selesai dilayani.`,
    );
  } catch (error) {
    console.error("Gagal menyelesaikan antrean:", error);
    toast.error(
      "Gagal Terhubung",
      "Gagal memperbarui status antrean. Periksa koneksi dan coba lagi.",
    );
  } finally {
    isProcessing.value = false;
  }
};

const isProcessing = ref(false);
const handleSkipNumber = async () => {
  if (isProcessing.value) return;

  try {
    isProcessing.value = true;

    await skipServingNumber(activeServiceId.value);

    toast.success(
      "Antrean Dilewati",
      `Nomor antrean ${formattedCurrentNumber.value} telah dilewati.`,
    );
  } catch (error) {
    console.error("Gagal melewati antrean:", error);
    toast.error(
      "Gagal Terhubung",
      "Gagal mengubah status antrean. Silakan periksa koneksi internet dan coba lagi.",
    );
  } finally {
    isProcessing.value = false;
  }
};

const openCloseCounterDialog = () => {
  isCloseCounterDialogOpen.value = true;
};

const confirmCloseCounter = async () => {
  await closeCounter(activeServiceId.value);
  toast.success(
    `${servicePointConfig.value.label} ditutup`,
    `${servicePointName.value} untuk layanan ${activeServiceName.value} sudah ditutup.`,
  );
  isCloseCounterDialogOpen.value = false;
  router.push(eventDetailPath.value);
};

const handleOpenCounter = async () => {
  await openCounter(activeServiceId.value);
  toast.success(
    `${servicePointConfig.value.label} dibuka`,
    `${servicePointName.value} untuk layanan ${activeServiceName.value} siap menerima pemanggilan.`,
  );
};

// Format nomor antrean (misal: R-013)
const formattedCurrentNumber = computed(() => {
  if (!activeService.value) return "---";

  return formatQueueNumber(activeService.value.id, activeService.value.prefix);
});

// const formattedNextNumber = computed(() => {
//   if (!activeService.value) return "---";

//   const nextNumber = activeQueue.value.currentNumber + 1;
//   return `${activeService.value.prefix}-${nextNumber.toString().padStart(3, "0")}`;
// });
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header
      class="bg-white border-b border-border-subtle px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm"
    >
      <div class="flex items-center gap-4">
        <RouterLink
          :to="eventDetailPath"
          aria-label="Kembali ke detail kegiatan"
          title="Kembali"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-gray-100 hover:text-text-main transition-colors"
        >
          <HugeiconsIcon :icon="ArrowLeft02Icon" :size="20" :stroke-width="2" />
        </RouterLink>
        <div>
          <h1 class="text-lg font-heading font-bold text-text-main">
            {{ servicePointName }}:
            {{ activeService?.name || assignedService.name }}
          </h1>
          <p class="text-sm text-text-muted">{{ currentEvent.title }}</p>
        </div>
        <span
          class="px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider"
          :class="getQueueStatusBadgeClass(activeQueue.status)"
        >
          {{ getQueueStatusLabel(activeQueue.status) }}
        </span>
      </div>
      <button
        type="button"
        @click="openCloseCounterDialog"
        class="flex items-center gap-2 text-text-muted hover:text-red-600 text-sm font-medium transition-colors"
      >
        <HugeiconsIcon :icon="Logout02Icon" :size="20" :stroke-width="2" />
        Tutup {{ servicePointConfig.label }}
      </button>
    </header>

    <main
      v-if="isServiceFound"
      class="flex-1 flex items-center justify-center p-6"
    >
      <div
        class="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6"
      >
        <aside
          class="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden self-start"
        >
          <div class="px-5 py-4 border-b border-border-subtle bg-gray-50/60">
            <h2 class="font-heading font-semibold text-text-main">
              Pilih Layanan
            </h2>
            <p class="text-sm text-text-muted mt-1">
              Pantau status antrean setiap layanan.
            </p>
          </div>

          <div class="p-3 grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2">
            <button
              v-for="service in eventServices"
              :key="service.id"
              type="button"
              @click="switchService(service.id)"
              class="w-full min-w-0 text-left rounded-xl border p-3 transition-colors tactile-btn lg:p-3"
              :class="
                service.id === serviceId
                  ? 'border-brand-primary bg-brand-primary-light'
                  : 'border-border-subtle bg-white hover:bg-gray-50'
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-text-main truncate">
                    {{ service.name }}
                  </p>
                  <p class="text-xs text-text-muted mt-1">
                    Nomor saat ini
                    <span class="font-mono font-bold text-brand-primary">
                      {{ formatQueueNumber(service.id, service.prefix) }}
                    </span>
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
                  :class="
                    getQueueStatusBadgeClass(
                      getQueueByServiceId(service.id).status,
                    )
                  "
                >
                  {{
                    getQueueStatusLabel(getQueueByServiceId(service.id).status)
                  }}
                </span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div
                  class="rounded-lg bg-white/70 border border-border-subtle px-3 py-2 lg:px-2.5 lg:py-1.5"
                >
                  <p class="text-xs text-text-muted">Sisa</p>
                  <p class="font-bold text-text-main">
                    {{ getQueueByServiceId(service.id).totalWaiting }}
                  </p>
                </div>
                <div
                  class="rounded-lg bg-white/70 border border-border-subtle px-3 py-2 lg:px-2.5 lg:py-1.5"
                >
                  <p class="text-xs text-text-muted">Terbit</p>
                  <p class="font-bold text-text-main">{{ service.count }}</p>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <section class="min-w-0">
          <div class="flex justify-between items-end mb-6 px-2">
            <div>
              <p class="text-text-muted font-medium mb-1">
                Status {{ servicePointConfig.label }}
              </p>
              <div class="flex items-center gap-2">
                <span class="relative flex h-3 w-3">
                  <span
                    v-if="activeQueue.status === 'serving'"
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
                  ></span>
                  <span
                    class="relative inline-flex rounded-full h-3 w-3"
                    :class="getQueueStatusDotClass(activeQueue.status)"
                  ></span>
                </span>
                <span
                  class="font-bold text-lg"
                  :class="{
                    'text-green-600': activeQueue.status === 'serving',
                    'text-red-600': activeQueue.status === 'closed',
                    'text-gray-500': activeQueue.status === 'idle',
                  }"
                >
                  {{ getQueueStatusLabel(activeQueue.status) }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-text-muted font-medium mb-1">Sisa Antrean</p>
              <div
                class="flex items-center gap-2 text-2xl font-bold text-text-main justify-end"
              >
                <HugeiconsIcon
                  :icon="UserGroupIcon"
                  :size="24"
                  class="text-brand-primary"
                />
                {{ activeQueue.totalWaiting }}
              </div>
            </div>
          </div>

          <div
            class="bg-white rounded-2xl shadow-lg border border-border-subtle p-12 text-center mb-8 relative overflow-hidden"
          >
            <p
              class="text-text-muted font-medium text-lg uppercase tracking-widest mb-4"
            >
              Nomor Saat Ini
            </p>
            <h2
              class="text-8xl md:text-[9rem] font-heading font-black text-brand-primary leading-none tracking-tighter"
            >
              {{ formattedCurrentNumber }}
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              @click="handleRecallNumber"
              :disabled="activeQueue.status !== 'serving'"
              class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-border-subtle hover:border-brand-primary hover:bg-brand-primary-light text-text-main py-6 rounded-xl font-bold tactile-btn transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HugeiconsIcon
                :icon="VolumeHighIcon"
                :size="28"
                :stroke-width="2"
                class="text-brand-primary"
              />
              Panggil Ulang
            </button>

            <template v-if="activeQueue.status === 'serving'">
              <button
                @click="handleSkipNumber"
                :disabled="isProcessing"
                class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 py-6 rounded-xl font-bold tactile-btn transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-red-200"
              >
                <HugeiconsIcon
                  :icon="Cancel01Icon"
                  :size="28"
                  :stroke-width="2"
                />
                {{ isProcessing ? "Memproses..." : "Lewati" }}
              </button>

              <button
                @click="handleFinishServingNumber"
                class="flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-6 rounded-xl font-bold tactile-btn transition-all shadow-md"
              >
                <HugeiconsIcon
                  :icon="CheckmarkCircle02Icon"
                  :size="28"
                  :stroke-width="2"
                />
                Selesai
              </button>
            </template>

            <template v-else-if="activeQueue.status === 'closed'">
              <button
                @click="handleOpenCounter"
                class="sm:col-span-2 flex flex-col items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white py-6 rounded-xl font-bold tactile-btn transition-all shadow-md shadow-brand-primary/30"
              >
                <HugeiconsIcon
                  :icon="ArrowRight02Icon"
                  :size="28"
                  :stroke-width="2"
                />
                Buka {{ servicePointConfig.label }}
              </button>
            </template>

            <template v-else>
              <button
                @click="handleCallNextNumber"
                :disabled="isProcessing || activeQueue.totalWaiting === 0"
                :class="[
                  'sm:col-span-2 flex flex-col items-center justify-center gap-2 py-6 rounded-xl font-bold tactile-btn transition-all',
                  activeQueue.totalWaiting === 0
                    ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-md shadow-brand-primary/30',
                ]"
              >
                <HugeiconsIcon
                  :icon="
                    activeQueue.totalWaiting === 0
                      ? UserGroupIcon
                      : ArrowRight02Icon
                  "
                  :size="28"
                  :stroke-width="2"
                />
                {{
                  activeQueue.totalWaiting === 0
                    ? "Belum ada tiket diambil"
                    : "Panggil Berikutnya"
                }}
              </button>
            </template>
          </div>
        </section>
      </div>
    </main>

    <main v-else class="flex-1 flex items-center justify-center p-6">
      <section
        class="w-full max-w-md rounded-xl border border-border-subtle bg-white p-8 text-center shadow-sm"
      >
        <h2 class="text-xl font-heading font-bold text-text-main">
          Layanan tidak ditemukan
        </h2>
        <p class="mt-2 text-sm text-text-muted">
          Tautan pemanggilan ini tidak cocok dengan layanan yang tersedia di
          kegiatan.
        </p>
        <RouterLink
          to="/events"
          class="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white tactile-btn hover:bg-brand-primary-hover"
        >
          Kembali ke Daftar Kegiatan
        </RouterLink>
      </section>
    </main>

    <ConfirmationDialog
      :is-open="isCloseCounterDialogOpen"
      :title="`Tutup ${servicePointConfig.label}?`"
      :description="`${servicePointName} untuk layanan ${activeServiceName} akan ditutup. Pemanggilan aktif akan dihentikan dan tombol panggil dinonaktifkan sampai dibuka kembali.`"
      :confirm-label="`Tutup ${servicePointConfig.label}`"
      cancel-label="Batal"
      variant="danger"
      @close="isCloseCounterDialogOpen = false"
      @confirm="confirmCloseCounter"
    />
  </div>
</template>
