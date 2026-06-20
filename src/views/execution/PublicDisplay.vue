<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import { Notification02Icon } from "@hugeicons/core-free-icons";
import { supabase } from "../../services/supabaseClient";

// Impor state reaktif dari store aplikasi
import {
  currentEvent,
  eventServices,
  servicePointConfig,
  servicePointName,
  getQueueByServiceId,
  getQueueStatusLabel,
  loadOrganizerState,
  subscribeToServiceQueue,
  eventQueues,
  initSyncChannel,
  organizerAccount,
} from "../../data/appStore";

// Waktu Real-time untuk Header
const currentTime = ref("");
let timer: number;
let unsubscribeQueue: (() => void) | null = null;
let unsubscribeConfig: (() => void) | null = null;

const subscribeToActiveService = (userId: string) => {
  const channel = supabase
    .channel(`display-config:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "service_point_configs",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        if (payload.eventType === "DELETE") return;
        const newServiceId = (payload.new as any).active_service_id;
        if (!newServiceId) return;

        // 1. Ganti subscription realtime untuk queue baru
        unsubscribeQueue?.();
        unsubscribeQueue = subscribeToServiceQueue(newServiceId);

        // 2. Fetch antrean segar dari database untuk menghindari Stale Data
        const { data: freshQueue } = await supabase
          .from("queues")
          .select("*")
          .eq("service_id", newServiceId)
          .single();

        if (freshQueue) {
          const idx = eventQueues.value.findIndex(
            (q) => q.serviceId === newServiceId,
          );
          if (idx !== -1) {
            eventQueues.value[idx] = {
              currentNumber: freshQueue.current_number || 0,
              serviceId: freshQueue.service_id,
              status: freshQueue.status || "idle",
              totalWaiting: freshQueue.total_waiting || 0,
            };
          }
        }

        // 3. Update active ID (akan memicu pembaruan UI via computed Vue)
        activeDisplayServiceId.value = newServiceId;
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

const activeDisplayServiceId = ref<number>(0);

onMounted(async () => {
  await loadOrganizerState();
  const userId = organizerAccount.value.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Ambil active_service_id saat ini dari DB
  const { data: config } = await supabase
    .from("service_point_configs")
    .select("active_service_id")
    .eq("user_id", user.id)
    .single();

  const initialServiceId =
    config?.active_service_id || eventServices.value[0]?.id;

  if (initialServiceId) {
    activeDisplayServiceId.value = initialServiceId;
    unsubscribeQueue = subscribeToServiceQueue(initialServiceId);
  }

  // Mulai dengerin perubahan service dari operator
  unsubscribeConfig = subscribeToActiveService(user.id);

  if (!userId) {
    console.warn("Menunggu data organizer dimuat...");
    return;
  }
  initSyncChannel(userId, (newServiceId) => {
    // 1. Ganti variabel ID layanan di layar UI seketika
    activeDisplayServiceId.value = newServiceId;

    // 2. Matikan realtime antrean lama, hidupkan realtime antrean baru
    if (unsubscribeQueue) unsubscribeQueue();
    unsubscribeQueue = subscribeToServiceQueue(newServiceId);
  });

  // Timer jam
  const updateTime = () => {
    currentTime.value = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
  unsubscribeQueue?.(); // ← cleanup
  unsubscribeConfig?.(); // ← cleanup
});

const displayService = computed(
  () =>
    eventServices.value.find((s) => s.id === activeDisplayServiceId.value) ||
    eventServices.value[0],
);

const displayQueue = computed(() =>
  getQueueByServiceId(activeDisplayServiceId.value),
);

// Format nomor yang sedang dipanggil
const currentNumber = computed(() => {
  if (displayQueue.value.currentNumber === 0) return "---";
  const num = displayQueue.value.currentNumber.toString().padStart(3, "0");
  return `${displayService.value.prefix}-${num}`;
});

const isPulsing = computed(() => displayQueue.value.status === "serving");
</script>

<template>
  <div
    class="h-screen w-screen bg-surface flex flex-col overflow-hidden font-sans"
  >
    <header
      class="h-20 bg-brand-primary text-white px-8 flex justify-between items-center shadow-md z-10"
    >
      <div>
        <h1 class="text-2xl font-heading font-bold tracking-wide">
          {{ currentEvent.title }}
        </h1>
        <p class="text-brand-primary-light font-medium mt-0.5">
          {{ currentEvent.date }}
        </p>
      </div>
      <div class="text-3xl font-heading font-bold tracking-widest tabular-nums">
        {{ currentTime }}
      </div>
    </header>

    <main class="flex-1 grid grid-cols-12 gap-6 p-6 bg-gray-50">
      <div class="col-span-7 flex flex-col gap-6">
        <div
          class="bg-white rounded-3xl shadow-lg border border-border-subtle flex-1 flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div
            class="absolute top-8 flex items-center gap-3 px-6 py-2 rounded-full transition-all duration-500"
            :class="
              isPulsing
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-text-muted'
            "
          >
            <HugeiconsIcon
              :icon="Notification02Icon"
              :size="24"
              :class="{ 'animate-bounce': isPulsing }"
            />
            <span class="text-lg font-bold uppercase tracking-widest">
              {{
                isPulsing
                  ? `Silakan Menuju ${servicePointName}`
                  : "Menunggu Panggilan"
              }}
            </span>
          </div>

          <h2
            class="text-[10.5rem] leading-none font-heading font-black tracking-tighter transition-colors duration-500"
            :class="isPulsing ? 'text-brand-primary' : 'text-gray-400'"
          >
            {{ currentNumber }}
          </h2>

          <p class="text-4xl text-text-muted font-medium mt-8">
            {{ servicePointConfig.label }}:
            <span class="text-text-main font-bold">{{
              displayService.name
            }}</span>
          </p>
        </div>
      </div>

      <div class="col-span-5 flex flex-col gap-6">
        <div
          class="bg-gray-200 rounded-3xl overflow-hidden shadow-inner flex-1 relative flex items-center justify-center border border-border-subtle"
        >
          <p class="text-gray-400 font-medium tracking-widest uppercase">
            Area Video / Promosi
          </p>
        </div>

        <div
          class="bg-white rounded-3xl shadow-sm border border-border-subtle p-8 h-48 flex items-center justify-between"
        >
          <div>
            <p class="text-xl text-text-muted font-medium">
              Total Sisa Antrean
            </p>
            <p
              class="text-6xl font-heading font-bold text-text-main mt-2 tabular-nums"
            >
              {{ displayQueue.totalWaiting }}
            </p>
          </div>
          <div class="h-full w-px bg-border-subtle"></div>
          <div class="text-right">
            <p class="text-xl text-text-muted font-medium">Status</p>
            <p
              class="text-3xl font-heading font-bold mt-4"
              :class="
                displayQueue.status === 'closed'
                  ? 'text-red-600'
                  : 'text-green-600'
              "
            >
              {{ getQueueStatusLabel(displayQueue.status) }}
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
