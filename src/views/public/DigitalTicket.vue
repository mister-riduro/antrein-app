<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  QrCodeIcon,
  Clock01Icon,
  Calendar01Icon,
  InformationCircleIcon,
  ArrowLeft02Icon,
} from "@hugeicons/core-free-icons";

import {
  activeTicket,
  currentEvent,
  eventServices,
  getQueueByServiceId,
  loadPublicTicket,
  subscribeToTicketStatus,
  subscribeToServiceQueue,
} from "../../data/appStore";

const route = useRoute();
const router = useRouter();
const ticketUuid = route.params.ticketUuid as string;
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

let unsubscribeTicket: (() => void) | null = null;
let unsubscribeQueue: (() => void) | null = null;

const ticketData = computed(() => activeTicket.value);

const serviceDetail = computed(() => {
  const ticket = ticketData.value;

  if (!ticket) {
    return { name: "Layanan", prefix: "X" };
  }

  return (
    eventServices.value.find((s) => s.id === ticket.serviceId) || {
      name: "Layanan",
      prefix: "X",
    }
  );
});

const serviceQueue = computed(() =>
  getQueueByServiceId(ticketData.value?.serviceId || 0),
);

const formattedYourNumber = computed(() => {
  if (!ticketData.value) return "---";

  const num = ticketData.value.yourNumber.toString().padStart(3, "0");
  return `${serviceDetail.value.prefix}-${num}`;
});

const formattedCurrentLiveNumber = computed(() => {
  const num = serviceQueue.value.currentNumber.toString().padStart(3, "0");
  return `${serviceDetail.value.prefix}-${num}`;
});

const queueDistance = computed(() => {
  // Jika tiket sudah dipanggil, dilewati, atau selesai, sisa antrean 0
  if (!ticketData.value || ticketData.value.status !== "waiting") {
    return 0;
  }

  // Mengambil data real-time total sisa antrean yang sama persis dengan Operator Console
  return serviceQueue.value.totalWaiting || 0;
});

// GABUNGAN onMounted (Hanya dideklarasikan satu kali)
onMounted(async () => {
  try {
    await loadPublicTicket(ticketUuid);

    unsubscribeTicket = subscribeToTicketStatus(ticketUuid);

    if (activeTicket.value?.serviceId) {
      unsubscribeQueue = subscribeToServiceQueue(activeTicket.value.serviceId);
    }
  } catch (error) {
    console.error("Gagal memuat tiket:", error);
    errorMessage.value = "Tiket tidak ditemukan atau sudah tidak tersedia.";
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  unsubscribeTicket?.();
  unsubscribeQueue?.();
});

const ticketStatus = computed(() => {
  if (!ticketData.value) return "WAITING";

  const dbStatus = ticketData.value.status;

  if (dbStatus === "called") return "CALLING";
  if (dbStatus === "served" || dbStatus === "skipped") return "COMPLETED";

  const current = serviceQueue.value.currentNumber;
  const mine = ticketData.value.yourNumber;

  if (current === mine) return "CALLING";
  if (current > mine) return "COMPLETED";

  return "WAITING";
});

const handleBackToRegistration = () => {
  router.back();
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans"
  >
    <div
      v-if="isLoading"
      class="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl"
    >
      <div
        class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-primary border-t-transparent"
      ></div>
      <p class="font-medium text-text-main">Memuat tiket...</p>
    </div>

    <div
      v-else-if="errorMessage"
      class="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl"
    >
      <p class="font-heading text-xl font-bold text-text-main">
        Tiket Tidak Ditemukan
      </p>
      <p class="mt-2 text-sm text-text-muted">{{ errorMessage }}</p>
    </div>

    <div
      v-else-if="ticketData"
      class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col relative"
    >
      <div class="bg-brand-primary p-6 text-white relative text-center">
        <h1 class="text-xl font-heading font-bold truncate">
          {{ currentEvent.title }}
        </h1>
        <p
          class="text-xs text-brand-primary-light font-medium mt-1 uppercase tracking-wider"
        >
          Tiket Antrean Digital
        </p>
      </div>

      <div
        class="p-6 flex flex-col items-center text-center border-b border-dashed border-gray-200 relative"
      >
        <span
          class="text-xs font-bold text-brand-primary bg-brand-primary-light px-3 py-1 rounded-full uppercase tracking-wide"
        >
          {{ serviceDetail.name }}
        </span>

        <h2
          class="text-6xl sm:text-7xl font-heading font-black text-text-main my-4 tracking-tighter"
        >
          {{ formattedYourNumber }}
        </h2>

        <div class="w-full mt-2">
          <div
            v-if="ticketStatus === 'WAITING'"
            class="bg-amber-50 border border-amber-200 rounded-2xl p-4"
          >
            <p
              class="text-sm text-amber-800 font-medium flex items-center justify-center gap-1.5"
            >
              <HugeiconsIcon
                :icon="Clock01Icon"
                :size="18"
                class="animate-spin duration-1000"
              />
              Menunggu Antrean
            </p>
            <p class="text-xs text-amber-600 mt-1">
              Ada
              <span class="font-bold text-sm">{{ queueDistance }}</span> nomor
              lagi sebelum giliran Anda.
            </p>
          </div>

          <div
            v-else-if="ticketStatus === 'CALLING'"
            class="bg-green-50 border border-green-200 rounded-2xl p-4 animate-pulse"
          >
            <p
              class="text-sm text-green-800 font-bold flex items-center justify-center gap-1.5"
            >
              <HugeiconsIcon :icon="InformationCircleIcon" :size="18" />
              Giliran Anda!
            </p>
            <p class="text-xs text-green-600 mt-1">
              Silakan segera menuju ke meja layanan.
            </p>
          </div>

          <div
            v-else
            class="bg-gray-50 border border-gray-200 rounded-2xl p-4 opacity-75"
          >
            <p
              class="text-sm text-gray-700 font-medium flex items-center justify-center gap-1.5"
            >
              Selesai Dilayani
            </p>
            <p class="text-xs text-gray-500 mt-1">
              Terima kasih telah mengikuti antrean dengan tertib.
            </p>
          </div>
        </div>

        <div
          class="absolute -bottom-3 -left-3 h-6 w-6 bg-gray-50 rounded-full border border-gray-100 shadow-inner"
        ></div>
        <div
          class="absolute -bottom-3 -right-3 h-6 w-6 bg-gray-50 rounded-full border border-gray-100 shadow-inner"
        ></div>
      </div>

      <div class="p-6 bg-gray-50/50 flex-1 flex flex-col items-center">
        <div
          class="w-full bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm mb-6"
        >
          <div class="text-left">
            <p
              class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              Nomor Sekarang
            </p>
            <p
              class="text-2xl font-heading font-black text-brand-primary mt-0.5"
            >
              {{ formattedCurrentLiveNumber }}
            </p>
          </div>
          <div class="h-8 w-px bg-gray-200"></div>
          <div class="text-right">
            <p
              class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              Waktu Cetak
            </p>
            <p class="text-sm font-bold text-text-main mt-1.5 tabular-nums">
              {{ ticketData.createdAt }}
            </p>
          </div>
        </div>

        <div
          class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center max-w-45 w-full"
        >
          <div
            class="bg-gray-100 rounded-xl p-2 w-full aspect-square flex items-center justify-center border border-dashed border-gray-300"
          >
            <HugeiconsIcon
              :icon="QrCodeIcon"
              :size="96"
              class="text-text-main"
            />
          </div>
          <p
            class="text-[10px] text-gray-400 font-mono mt-2 uppercase tracking-tight truncate w-full text-center"
          >
            {{ ticketUuid.split("-")[0] }}...
          </p>
        </div>

        <p class="text-center text-[11px] text-text-muted mt-6 max-w-70">
          Tunjukkan QR Code ini kepada operator atau simpan halaman ini sebagai
          bukti kehadiran.
        </p>

        <div class="mt-8 w-full flex flex-col gap-3">
          <button
            @click="handleBackToRegistration"
            class="text-xs font-medium text-gray-400 hover:text-text-main py-2 px-4 transition-colors rounded-lg active:bg-gray-100 flex items-center justify-center gap-1.5"
          >
            <HugeiconsIcon
              :icon="ArrowLeft02Icon"
              :size="14"
              :stroke-width="2"
            />
            Kembali
          </button>
        </div>
      </div>
    </div>

    <div
      class="mt-6 flex items-center gap-4 text-xs font-medium text-text-muted"
    >
      <span class="flex items-center gap-1">
        <HugeiconsIcon :icon="Calendar01Icon" :size="14" />
        {{ currentEvent.date }}
      </span>
      <span class="h-3 w-px bg-gray-300"></span>
      <span>ID Tiket Terverifikasi</span>
    </div>
  </div>
</template>
