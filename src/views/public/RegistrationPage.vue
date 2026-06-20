<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import { Ticket02Icon, Alert02Icon } from "@hugeicons/core-free-icons";

import {
  currentEvent,
  eventServices,
  loadPublicEvent,
  takeTicket,
} from "../../data/appStore";

const route = useRoute();
const router = useRouter();

// Tangkap parameter dinamis dari URL
const eventUuid = route.params.eventUuid as string;

const isProcessing = ref(false);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  try {
    await loadPublicEvent(eventUuid);
  } catch {
    errorMessage.value = "Kegiatan tidak ditemukan atau belum tersedia.";
  } finally {
    isLoading.value = false;
  }
});

const handleTakeTicket = async (serviceId: number) => {
  if (isProcessing.value) return;

  isProcessing.value = true;
  errorMessage.value = null;

  try {
    const result = await takeTicket(eventUuid, serviceId);

    if (result === "FULL") {
      errorMessage.value = "Mohon maaf, kuota layanan ini sudah penuh.";
      isProcessing.value = false;
      setTimeout(() => {
        errorMessage.value = null;
      }, 3000);
      return;
    }

    router.push({
      name: "DigitalTicket",
      params: { ticketUuid: result.ticket.ticketUuid },
      query: { number: result.formattedNumber },
    });
  } catch {
    errorMessage.value = "Gagal mengambil tiket. Coba lagi sebentar.";
  } finally {
    isProcessing.value = false;
  }
};

// // Fungsi untuk menangani update data saat real-time menerima sinyal
// const handleServiceUpdate = (newData: any) => {
//   const index = eventServices.value.findIndex((s) => s.id === newData.id);
//   if (index !== -1) {
//     eventServices.value[index] = { ...eventServices.value[index], ...newData };
//   }
// };
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col relative select-none">
    <header
      class="py-12 text-center bg-white shadow-sm border-b border-border-subtle px-4"
    >
      <h1
        class="text-3xl md:text-5xl font-heading font-black text-text-main tracking-tight"
      >
        Selamat Datang
      </h1>
      <p class="text-lg md:text-xl text-text-muted mt-3 font-medium">
        {{ currentEvent.title }}
      </p>
      <p class="text-xs text-gray-400 mt-2 font-mono">ID: {{ eventUuid }}</p>
    </header>

    <main
      class="flex-1 flex flex-col items-center justify-center p-6 md:p-8 max-w-5xl mx-auto w-full"
    >
      <div class="text-center mb-10">
        <h2 class="text-xl md:text-2xl font-bold text-text-main mb-2">
          Silakan Pilih Layanan
        </h2>
        <p class="text-text-muted text-sm md:text-base">
          Ketuk pada salah satu layanan di bawah ini untuk mendapatkan nomor
          antrean digital Anda.
        </p>
      </div>

      <div
        v-if="isLoading"
        class="bg-white border border-border-subtle px-6 py-4 rounded-xl text-text-muted"
      >
        Memuat layanan...
      </div>

      <div
        v-if="errorMessage"
        class="bg-red-100 text-red-700 border border-red-200 px-6 py-4 rounded-xl flex items-center gap-3 mb-8 w-full max-w-md animate-in slide-in-from-top-4"
      >
        <HugeiconsIcon :icon="Alert02Icon" :size="24" :stroke-width="2" />
        <span class="font-medium text-sm md:text-base">{{ errorMessage }}</span>
      </div>

      <div
        v-if="!isLoading"
        class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full"
      >
        <button
          v-for="service in eventServices"
          :key="service.id"
          @click="handleTakeTicket(service.id)"
          :disabled="isProcessing || service.status !== 'active'"
          class="bg-white border-2 border-border-subtle hover:border-brand-primary active:bg-brand-primary-light active:border-brand-primary rounded-3xl p-6 md:p-8 flex flex-col items-center text-center transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
        >
          <div
            v-if="service.status !== 'active'"
            class="absolute top-4 right-4 bg-gray-100 text-gray-600 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-gray-200 uppercase"
          >
            Tutup
          </div>
          <div
            v-else-if="
              service.quotaType === 'limited' &&
              service.count >= Number(service.quotaLimit)
            "
            class="absolute top-4 right-4 bg-red-100 text-red-700 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-red-200 uppercase"
          >
            Penuh
          </div>

          <div
            :class="[
              'h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center mb-4 md:mb-6 group-active:scale-95 transition-transform',
              service.status === 'active'
                ? 'bg-brand-primary-light'
                : 'bg-gray-100',
            ]"
          >
            <HugeiconsIcon
              :icon="Ticket02Icon"
              :size="32"
              :class="[
                'md:w-10 md:h-10',
                service.status === 'active'
                  ? 'text-brand-primary'
                  : 'text-gray-400',
              ]"
              :stroke-width="2"
            />
          </div>

          <h3
            class="text-xl md:text-2xl font-heading font-bold text-text-main mb-1 md:mb-2"
          >
            {{ service.name }}
          </h3>

          <p class="text-text-muted font-medium text-sm md:text-base">
            {{
              service.status === "active"
                ? `Antrean saat ini: ${service.count}`
                : "Layanan tidak tersedia"
            }}
          </p>

          <div
            :class="[
              'mt-6 md:mt-8 w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex justify-center items-center gap-2 transition-colors',
              service.status === 'active'
                ? 'bg-brand-primary text-white group-active:bg-brand-primary-hover'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed',
            ]"
          >
            <span
              v-if="isProcessing"
              class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            ></span>
            <span v-else-if="service.status !== 'active'">Layanan Tutup</span>
            <span v-else>Ambil Tiket</span>
          </div>
        </button>
      </div>
    </main>

    <footer
      class="py-6 text-center text-text-muted text-xs md:text-sm font-medium"
    >
      Powered by AntreIn
    </footer>
  </div>
</template>
