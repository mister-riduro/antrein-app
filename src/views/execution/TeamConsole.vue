<template>
  <div
    class="relative min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8"
  >
    <div
      v-if="!isOnline"
      class="absolute top-0 left-0 w-full bg-red-500 text-white text-center py-2 text-sm font-semibold z-40 shadow-md"
    >
      Koneksi internet terputus. Menunggu jaringan...
    </div>

    <header
      class="w-full max-w-4xl flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-border-subtle"
    >
      <div>
        <h1 class="text-xl font-heading font-bold text-text-main">
          Loket: {{ serviceName }}
        </h1>
        <p class="text-sm text-text-muted">Akses Tim Operator</p>
      </div>
      <button
        @click="logout"
        class="flex items-center gap-2 text-text-muted hover:text-red-600 text-sm font-medium transition-colors bg-gray-100 hover:bg-red-50 px-4 py-2 rounded-xl"
      >
        <HugeiconsIcon :icon="Logout02Icon" :size="20" :stroke-width="2" />
        Akhiri Sesi
      </button>
    </header>

    <main
      class="w-full max-w-4xl bg-white rounded-3xl shadow-md border border-border-subtle p-6 md:p-10 flex flex-col gap-8"
    >
      <div
        class="flex justify-between items-end border-b border-border-subtle pb-6"
      >
        <div>
          <p class="text-text-muted font-medium mb-1">Status Loket</p>
          <div class="flex items-center gap-2">
            <span class="relative flex h-3 w-3">
              <span
                v-if="activeQueue?.status === 'serving'"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-3 w-3"
                :class="getQueueStatusDotClass(activeQueue?.status || 'idle')"
              ></span>
            </span>
            <span
              class="font-bold text-xl"
              :class="{
                'text-green-600': activeQueue?.status === 'serving',
                'text-red-600': activeQueue?.status === 'closed',
                'text-gray-500': activeQueue?.status === 'idle' || !activeQueue,
              }"
            >
              {{ getQueueStatusLabel(activeQueue?.status || "idle") }}
            </span>
          </div>
        </div>
        <div class="text-right">
          <p class="text-text-muted font-medium mb-1">Sisa Antrean</p>
          <div
            class="flex items-center gap-2 text-3xl font-bold text-text-main justify-end"
          >
            <HugeiconsIcon
              :icon="UserGroupIcon"
              :size="28"
              class="text-brand-primary"
            />
            {{ activeQueue?.totalWaiting || 0 }}
          </div>
        </div>
      </div>

      <div
        class="bg-gray-50 rounded-2xl border border-border-subtle p-8 text-center relative overflow-hidden"
      >
        <p
          class="text-text-muted font-medium text-lg uppercase tracking-widest mb-2"
        >
          Nomor Saat Ini
        </p>
        <h2
          class="text-7xl md:text-[8rem] font-heading font-black text-brand-primary leading-none tracking-tighter"
        >
          {{ formattedCurrentNumber }}
        </h2>
      </div>

      <div class="flex flex-col gap-4">
        <template v-if="activeQueue?.status === 'serving'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="grid grid-cols-2 gap-4">
              <button
                @click="handleRecallNumber"
                :disabled="isProcessing"
                class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-border-subtle hover:border-brand-primary hover:bg-brand-primary-light text-text-main py-6 rounded-2xl font-bold tactile-btn transition-all disabled:opacity-50"
              >
                <HugeiconsIcon
                  :icon="VolumeHighIcon"
                  :size="28"
                  :stroke-width="2"
                  class="text-brand-primary"
                />
                Panggil Ulang
              </button>

              <button
                @click="handleSkipNumber"
                :disabled="isProcessing"
                class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-red-200 hover:border-red-600 hover:bg-red-50 text-red-600 py-6 rounded-2xl font-bold tactile-btn transition-all disabled:opacity-50"
              >
                <HugeiconsIcon
                  :icon="Cancel01Icon"
                  :size="28"
                  :stroke-width="2"
                />
                Lewati
              </button>
            </div>

            <button
              @click="handleFinishServingNumber"
              :disabled="isProcessing"
              class="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-6 rounded-2xl font-bold text-xl tactile-btn transition-all shadow-lg"
            >
              <HugeiconsIcon
                :icon="CheckmarkCircle02Icon"
                :size="36"
                :stroke-width="2"
              />
              Selesai Dilayani
            </button>
          </div>
        </template>

        <template v-else-if="activeQueue?.status === 'idle'">
          <button
            @click="handleCallNextNumber"
            :disabled="isProcessing || activeQueue?.totalWaiting === 0"
            :class="[
              'w-full flex flex-col items-center justify-center gap-3 py-10 md:py-14 rounded-3xl font-black text-2xl md:text-4xl transition-all',
              activeQueue?.totalWaiting === 0
                ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xl shadow-brand-primary/30 tactile-btn scale-100 hover:scale-[1.01]',
            ]"
          >
            <HugeiconsIcon
              :icon="
                activeQueue?.totalWaiting === 0
                  ? UserGroupIcon
                  : ArrowRight02Icon
              "
              :size="48"
              :stroke-width="2"
            />
            {{
              activeQueue?.totalWaiting === 0
                ? "Belum Ada Antrean"
                : "PANGGIL BERIKUTNYA"
            }}
          </button>
        </template>
      </div>
    </main>

    <div
      v-if="isSessionKicked || isExpired || isSessionRevoked"
      class="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center backdrop-blur-sm p-4"
    >
      <div
        class="bg-white p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl"
      >
        <div
          class="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <HugeiconsIcon :icon="Cancel01Icon" :size="40" :stroke-width="2" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          {{ isExpired ? "Sesi Berakhir" : (isSessionRevoked ? "Akses Dicabut" : "Sesi Diambil Alih") }}
        </h2>
        <p class="text-gray-600 mb-8 font-medium">
          {{
            isExpired
              ? "Waktu penugasan untuk kegiatan ini telah selesai."
              : (isSessionRevoked ? "Kode akses Anda telah dicabut oleh pihak Organizer." : "Loket ini sedang dioperasikan oleh perangkat lain.")
          }}
        </p>
        <button
          @click="logout"
          class="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-primary-hover transition-colors shadow-md"
        >
          Kembali ke Layar Login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../services/supabaseClient";
import { useToast } from "../../composables/useToast";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  VolumeHighIcon,
  CheckmarkCircle02Icon,
  ArrowRight02Icon,
  Cancel01Icon,
  UserGroupIcon,
  Logout02Icon,
} from "@hugeicons/core-free-icons";

// Impor fungsi operasional dan suara dari store bawaanmu
import {
  getQueueByServiceId,
  subscribeToServiceQueue,
  callNextNumber,
  finishServingNumber,
  skipServingNumber,
  recallNumber,
  getQueueStatusLabel,
  getQueueStatusDotClass,
} from "../../data/appStore";
import { useIndonesianTts } from "../../composables/useIndonesianTts";

const router = useRouter();
const toast = useToast();
const { speak, stop } = useIndonesianTts();

const sessionData = {
  token: sessionStorage.getItem("team_session_token"),
  assignmentId: sessionStorage.getItem("team_assignment_id"),
  serviceId: Number(sessionStorage.getItem("team_service_id")),
  expiresAt: sessionStorage.getItem("team_expires_at"),
};

// States
const serviceName = ref("Memuat layanan...");
const servicePrefix = ref("");
const isProcessing = ref(false);
const isOnline = ref(navigator.onLine);
const isSessionKicked = ref(false);
const isSessionRevoked = ref(false);
const isExpired = ref(false);

let realtimeChannel: any;
let assignmentChannel: any;
let expireCheckInterval: any;
let unsubscribeQueue: any;

// Reaktivitas Antrean
const activeQueue = computed(() => getQueueByServiceId(sessionData.serviceId));

const formattedCurrentNumber = computed(() => {
  if (!activeQueue.value || activeQueue.value.currentNumber === 0) return "---";
  return `${servicePrefix.value}-${activeQueue.value.currentNumber.toString().padStart(3, "0")}`;
});

// Fetch nama dan prefix dari DB karena tidak ada Organizer Store di sini
const fetchServiceDetails = async () => {
  const { data } = await supabase
    .from("services")
    .select("name, prefix")
    .eq("id", sessionData.serviceId)
    .single();
  if (data) {
    serviceName.value = data.name;
    servicePrefix.value = data.prefix;
  }
};

// Fitur Pengumuman Suara (TTS)
const buildAnnouncementText = () => {
  return [
    `Nomor antrean, ${servicePrefix.value}, ${activeQueue.value.currentNumber}.`,
    `Silakan menuju loket.`,
    `Layanan ${serviceName.value}.`,
  ].join(" ");
};

const announceCurrentNumber = () => {
  stop();
  speak(buildAnnouncementText());
};

// Handlers (Sama persis dengan OperatorConsole)
const handleCallNextNumber = async () => {
  if (isProcessing.value || activeQueue.value?.status === "closed") return;
  try {
    isProcessing.value = true;
    await callNextNumber(sessionData.serviceId);
    announceCurrentNumber();
  } catch (err) {
    console.error(err);
    toast.error(
      "Gagal",
      "Tidak dapat memanggil nomor. Pastikan koneksi stabil.",
    );
  } finally {
    isProcessing.value = false;
  }
};

const handleRecallNumber = async () => {
  if (isProcessing.value) return;
  try {
    isProcessing.value = true;
    await recallNumber(sessionData.serviceId);
    announceCurrentNumber();
  } finally {
    isProcessing.value = false;
  }
};

const handleFinishServingNumber = async () => {
  if (isProcessing.value) return;
  try {
    isProcessing.value = true;
    stop();
    await finishServingNumber(sessionData.serviceId);
    toast.success(
      "Selesai",
      `Nomor ${formattedCurrentNumber.value} selesai dilayani.`,
    );
  } catch (err) {
    console.error(err);
    toast.error("Gagal", "Gagal memperbarui status antrean.");
  } finally {
    isProcessing.value = false;
  }
};

const handleSkipNumber = async () => {
  if (isProcessing.value) return;
  try {
    isProcessing.value = true;
    stop();
    await skipServingNumber(sessionData.serviceId);
    toast.success(
      "Dilewati",
      `Nomor ${formattedCurrentNumber.value} dilewati.`,
    );
  } catch (err) {
    console.error(err);
    toast.error("Gagal", "Gagal melewati antrean.");
  } finally {
    isProcessing.value = false;
  }
};

// Pengaman Sesi
const checkExpiration = () => {
  if (sessionData.expiresAt && new Date() > new Date(sessionData.expiresAt)) {
    isExpired.value = true;
    sessionStorage.clear();
  }
};

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
};

const logout = () => {
  sessionStorage.clear();
  router.push("/team/login");
};

// Lifecycle Hooks
onMounted(async () => {
  if (!sessionData.token || !sessionData.serviceId)
    return router.push("/team/login");

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  // 1. Verifikasi apakah assignment masih aktif di DB (tidak di-revoke)
  const { data: assignmentDb, error: assignmentError } = await supabase
    .from("team_assignments")
    .select("id")
    .eq("id", sessionData.assignmentId)
    .maybeSingle();

  if (assignmentError || !assignmentDb) {
    console.error("Assignment verification failed:", assignmentError, assignmentDb);
    logout();
    return;
  }

  // 2. Verifikasi apakah sesi operator masih aktif & token cocok di DB
  const { data: sessionDb, error: sessionError } = await supabase
    .from("operator_sessions")
    .select("session_token")
    .eq("assignment_id", sessionData.assignmentId)
    .maybeSingle();

  if (sessionError || !sessionDb || sessionDb.session_token !== sessionData.token) {
    console.error("Session verification failed:", sessionError, sessionDb, sessionData.token);
    logout();
    return;
  }

  await fetchServiceDetails();

  // Berlangganan data antrean dari store
  unsubscribeQueue = subscribeToServiceQueue(sessionData.serviceId);

  // Realtime Kick (Cek apakah ada yang login dengan kode akses yang sama)
  realtimeChannel = supabase
    .channel(`operator_${sessionData.assignmentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "operator_sessions",
        filter: `assignment_id=eq.${sessionData.assignmentId}`,
      },
      (payload: any) => {
        if (
          payload.eventType === "DELETE" ||
          (payload.eventType === "UPDATE" &&
            payload.new.session_token !== sessionData.token)
        ) {
          isSessionKicked.value = true;
        }
      },
    )
    .subscribe();

  // Realtime Revoke (Cek apakah kode akses dihapus oleh organizer)
  assignmentChannel = supabase
    .channel(`assignment_${sessionData.assignmentId}`)
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "team_assignments",
        filter: `id=eq.${sessionData.assignmentId}`,
      },
      () => {
        isSessionRevoked.value = true;
      }
    )
    .subscribe();

  checkExpiration();
  expireCheckInterval = setInterval(checkExpiration, 10000);
});

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  if (assignmentChannel) supabase.removeChannel(assignmentChannel);
  if (expireCheckInterval) clearInterval(expireCheckInterval);
  if (unsubscribeQueue) unsubscribeQueue();
});
</script>
