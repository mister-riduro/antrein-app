// File: src/data/appStore.ts
import { computed, ref } from "vue";
import { supabase } from "../services/supabaseClient";
import { organizerApi } from "../services/organizerApi";
import type {
  DbQueue,
  DbService,
  DbTicket,
  EventInfo,
  EventStatus,
  OperatorStatus,
  OrganizerAccount,
  QueueState,
  QuotaType,
  RpcTakeTicketRow,
  Service,
  ServicePointConfig,
  TakeTicketResult,
  Ticket,
} from "./types";

import { organizerAccount, servicePointConfig } from "./modules/accountStore";
import { currentEvent, eventQueues, eventServices } from "./modules/eventStore";
import {
  getInitials,
  mapQueue,
  mapService,
  mapTicket,
} from "./modules/mappers";
import {
  addServiceToEvent,
  deleteService,
  updateService,
} from "./modules/serviceStore";
// Re-export agar semua component tidak perlu ubah import path
export { addServiceToEvent, deleteService, updateService };

import {
  assignedService,
  callNextNumber,
  closeCounter,
  finishServingNumber,
  getQueueByServiceId,
  getQueueStatusBadgeClass,
  getQueueStatusDotClass,
  getQueueStatusLabel,
  openCounter,
  operatorQueue,
  recallNumber,
  selectedServiceId,
  skipServingNumber,
} from "./modules/queueStore";
export {
  assignedService,
  callNextNumber,
  closeCounter,
  finishServingNumber,
  getQueueByServiceId,
  getQueueStatusBadgeClass,
  getQueueStatusDotClass,
  getQueueStatusLabel,
  openCounter,
  operatorQueue,
  recallNumber,
  selectedServiceId,
  skipServingNumber,
};

export type {
  EventInfo,
  EventStatus,
  OperatorStatus,
  OrganizerAccount,
  QueueState,
  QuotaType,
  Service,
  ServicePointConfig,
  Ticket,
};

let activeFetchPromise: Promise<void> | null = null;
let syncChannel: ReturnType<typeof supabase.channel> | null = null;
let eventTicketSubscription: ReturnType<typeof supabase.channel> | null = null;

export const servicePointName = computed({
  get: () => servicePointConfig.value.label,
  set: (newValue) => {
    servicePointConfig.value.label = newValue;
  },
});
export {
  currentEvent,
  eventQueues,
  eventServices,
  organizerAccount,
  servicePointConfig,
};

export const isStateInitialized = ref(false);
export const isBackgroundLoading = ref(false);

// Dipanggil saat logout agar state organizer tidak bocor ke session berikutnya.
// Supabase channel juga di-unsubscribe supaya tidak ada listener liar setelah logout.
export const resetOrganizerState = () => {
  // Cabut semua realtime subscription aktif
  if (syncChannel) {
    void supabase.removeChannel(syncChannel);
    syncChannel = null;
  }
  if (eventTicketSubscription) {
    void supabase.removeChannel(eventTicketSubscription);
    eventTicketSubscription = null;
  }
  activeFetchPromise = null;

  // Reset account
  organizerAccount.value = {
    id: "",
    email: "",
    name: "",
    initials: "A",
    phone: "",
    organization: "",
    role: "",
  };
  servicePointConfig.value = { identifier: "1", label: "Loket" };

  // Reset event
  currentEvent.value = {
    id: "",
    title: "",
    description: "",
    date: "",
    status: "draft",
  };
  eventServices.value = [];
  eventQueues.value = [];

  // Reset flags
  isStateInitialized.value = false;
  isBackgroundLoading.value = false;
};

export async function loadOrganizerState(forceRefresh = false) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await ensureServicePointConfig(user.id, eventServices.value[0]?.id);

  const fetchLatestState = async () => {
    try {
      isBackgroundLoading.value = true;

      // Tiga call ini tidak saling bergantung — jalankan paralel
      const [accountData, configData, latestEventData] = await Promise.all([
        organizerApi.getAccount(user.id),
        organizerApi.getConfig(user.id),
        organizerApi.getLatestEvent(user.id),
      ]);

      const safeAccountData = accountData || {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "",
        organization: user.user_metadata?.organization || "",
        phone: user.user_metadata?.phone || "",
        role: "organizer",
      };

      organizerAccount.value = {
        id: safeAccountData.id,
        email: safeAccountData.email,
        name: safeAccountData.name,
        initials: getInitials(safeAccountData.name),
        phone: safeAccountData.phone,
        organization: safeAccountData.organization,
        role: safeAccountData.role,
      };

      servicePointConfig.value = configData || {
        identifier: "1",
        label: "Loket",
      };

      if (!latestEventData) {
        currentEvent.value = {
          id: "",
          title: "",
          description: "",
          date: "",
          status: "draft",
        };
        eventServices.value = [];
        eventQueues.value = [];
        isStateInitialized.value = true;
        return;
      }

      const eventDetails = await organizerApi.getEventDetails(
        latestEventData.id,
      );

      currentEvent.value = {
        id: latestEventData.id,
        title: latestEventData.title,
        description: latestEventData.description,
        date: latestEventData.date,
        status: latestEventData.status,
      };

      eventServices.value = eventDetails.services.map(mapService);
      if (!selectedServiceId.value && eventServices.value.length > 0) {
        selectedServiceId.value = eventServices.value[0].id;
      }
      eventQueues.value = eventDetails.queues.map(mapQueue);

      isStateInitialized.value = true;
    } catch (err) {
      console.error("Gagal sinkronisasi data latar belakang:", err);
    } finally {
      isBackgroundLoading.value = false;
    }
  };

  if (forceRefresh) return fetchLatestState();

  if (isStateInitialized.value) {
    if (!activeFetchPromise) {
      activeFetchPromise = fetchLatestState().finally(() => {
        activeFetchPromise = null;
      });
    }
    return;
  }

  if (!activeFetchPromise) {
    activeFetchPromise = fetchLatestState().finally(() => {
      activeFetchPromise = null;
    });
  }

  await activeFetchPromise;
}

export const initSyncChannel = (
  userId: string,
  onServiceSwitched?: (newServiceId: number) => void,
) => {
  if (syncChannel) return syncChannel;

  syncChannel = supabase.channel(`sync-display-${userId}`);

  syncChannel.on(
    "broadcast",
    { event: "switch_service" },
    async (payload: any) => {
      const newServiceId = payload.payload.serviceId;

      // 1. CEK & FETCH DATA ANTREAN (QUEUES) SECARA OTOMATIS
      const { data: freshQueue } = await supabase
        .from("queues")
        .select("*")
        .eq("service_id", newServiceId)
        .maybeSingle();

      if (freshQueue) {
        const qIdx = eventQueues.value.findIndex(
          (q) => q.serviceId === newServiceId,
        );
        if (qIdx !== -1) {
          eventQueues.value[qIdx].currentNumber = freshQueue.current_number ||
            0;
          eventQueues.value[qIdx].status = freshQueue.status || "idle";
          eventQueues.value[qIdx].totalWaiting = freshQueue.total_waiting || 0;
        } else {
          // JIKA ANTREAN BARU, OTOMATIS SUNTIKKAN KE MEMORI LAYAR (Tanpa perlu refresh!)
          eventQueues.value.push({
            serviceId: freshQueue.service_id,
            currentNumber: freshQueue.current_number || 0,
            status: freshQueue.status || "idle",
            totalWaiting: freshQueue.total_waiting || 0,
          });
        }
      }

      // 2. CEK & FETCH DATA IDENTITAS LAYANAN (SERVICES) SECARA OTOMATIS
      const sIdx = eventServices.value.findIndex((s) => s.id === newServiceId);
      if (sIdx === -1) {
        // JIKA LAYANAN BARU DIBUAT OPERATOR, LAYAR PUBLIK AKAN DOWNLOAD DATANYA SEKARANG
        const { data: freshService } = await supabase
          .from("services")
          .select("*")
          .eq("id", newServiceId)
          .maybeSingle();

        if (freshService) {
          eventServices.value.push({
            id: freshService.id,
            eventId: freshService.event_id,
            name: freshService.name,
            prefix: freshService.prefix,
            count: freshService.count || 0,
            status: freshService.status || "active",
            quotaLimit: freshService.quota_limit || 0,
            quotaType: freshService.quota_type,
          });
        }
      }

      // 3. SETELAH DATA LENGKAP, EKSEKUSI PERPINDAHAN UI
      if (onServiceSwitched) {
        onServiceSwitched(newServiceId);
      }
    },
  );

  syncChannel.subscribe();
  return syncChannel;
};

export const subscribeToAllEventTickets = (eventId: string) => {
  if (eventTicketSubscription) {
    void supabase.removeChannel(eventTicketSubscription);
  }

  eventTicketSubscription = supabase
    .channel(`tickets-event-${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "tickets",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        const newTicket = payload.new;
        const targetServiceId = newTicket.service_id;

        // 1. UPDATE "SISA"
        const queueIndex = eventQueues.value.findIndex(
          (q) => q.serviceId === targetServiceId,
        );
        if (queueIndex !== -1) {
          eventQueues.value[queueIndex].totalWaiting =
            (eventQueues.value[queueIndex].totalWaiting || 0) + 1;
        } else {
          // JIKA BELUM ADA DI MEMORI: Masukkan data antrean baru secara dinamis
          eventQueues.value.push({
            serviceId: targetServiceId,
            currentNumber: 0,
            status: "idle",
            totalWaiting: 1,
          });
        }

        // 2. UPDATE "TERBIT"
        const serviceIndex = eventServices.value.findIndex(
          (s) => s.id === targetServiceId,
        );
        if (serviceIndex !== -1) {
          eventServices.value[serviceIndex].count =
            (eventServices.value[serviceIndex].count || 0) + 1;
        } else {
          // JIKA BELUM ADA DI MEMORI: Fetch data service barunya lalu push ke array
          void supabase
            .from("services")
            .select("*")
            .eq("id", targetServiceId)
            .single()
            .then(({ data }) => {
              if (data) {
                eventServices.value.push({
                  id: data.id,
                  eventId: data.event_id, // <-- Tambahan wajib
                  name: data.name,
                  prefix: data.prefix,
                  count: 1,
                  status: data.status || "active", // <-- Tambahan wajib
                  quotaLimit: data.quota_limit || 0, // Fallback jika null
                  quotaType: data.quota_type,
                });
              }
            });
        }
      },
    )
    .subscribe();

  return () => {
    if (eventTicketSubscription) {
      void supabase.removeChannel(eventTicketSubscription);
      eventTicketSubscription = null;
    }
  };
};

export async function updateOrganizerAccount(
  payload: Partial<typeof organizerAccount.value>,
) {
  const nextAccount = {
    ...organizerAccount.value,
    ...payload,
    initials: payload.name
      ? getInitials(payload.name)
      : organizerAccount.value.initials,
  };

  organizerAccount.value = nextAccount;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = {
      id: user.id,
      email: nextAccount.email,
      name: nextAccount.name,
      organization: nextAccount.organization,
      phone: nextAccount.phone,
      role: nextAccount.role || "organizer",
    };

    const { error: organizationError } = await supabase
      .from("organizations")
      .upsert(profile, { onConflict: "id" });

    if (organizationError) throw organizationError;

    const { error: userError } = await supabase
      .from("users")
      .upsert(
        { ...profile, initials: nextAccount.initials },
        { onConflict: "id" },
      );

    if (userError) throw userError;
  }
}

export async function switchActiveService(serviceId: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (syncChannel) {
    syncChannel.send({
      type: "broadcast",
      event: "switch_service",
      payload: { serviceId: serviceId },
    });
  }

  // Update DB dulu
  const { data, error } = await supabase
    .from("service_point_configs")
    .update({ active_service_id: serviceId })
    .eq("user_id", user.id)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `Tidak ada service_point_configs untuk user ${user.id} — seharusnya tidak terjadi setelah ensureServicePointConfig dipanggil.`,
    );
  }

  // Update local store juga (untuk OperatorConsole sendiri)
  servicePointConfig.value = {
    ...servicePointConfig.value,
    activeServiceId: serviceId,
  };
}

export async function ensureServicePointConfig(
  userId: string,
  defaultServiceId?: number,
) {
  const { data: existing, error: selectError } = await supabase
    .from("service_point_configs")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle(); // ← bukan .single(), supaya tidak throw kalau kosong

  if (selectError) throw selectError;
  if (existing) return; // sudah ada, tidak perlu apa-apa

  const { error: insertError } = await supabase
    .from("service_point_configs")
    .insert({ user_id: userId, active_service_id: defaultServiceId ?? null });

  if (insertError) throw insertError;
}

export async function updateServicePointConfig(
  payload: Partial<typeof servicePointConfig.value>,
) {
  const nextConfig = { ...servicePointConfig.value, ...payload };
  servicePointConfig.value = nextConfig;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.from("service_point_configs").upsert(
      {
        user_id: user.id,
        identifier: nextConfig.identifier,
        label: nextConfig.label,
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;
  }
}

export async function createEvent(payload: {
  title: string;
  date: string;
  description?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User tidak terautentikasi");

  const { data: newEvent, error } = await supabase
    .from("events")
    .insert({
      organizer_id: user.id,
      title: payload.title,
      date: payload.date,
      description: payload.description || "",
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw error;

  currentEvent.value = {
    id: newEvent.id,
    title: newEvent.title,
    description: newEvent.description,
    date: newEvent.date,
    status: newEvent.status,
  };

  eventServices.value = [];
  eventQueues.value = [];

  return newEvent;
}

export const activeTicket = ref<Ticket | null>(null);

export const eventStatusOptions: Array<{ label: string; value: EventStatus }> =
  [
    { label: "Aktif", value: "live" },
    { label: "Draf", value: "draft" },
    { label: "Selesai", value: "completed" },
  ];

export const updateCurrentEvent = async (eventPayload: Partial<EventInfo>) => {
  if (!currentEvent.value.id) throw new Error("Kegiatan belum dipilih");

  const { data, error } = await supabase
    .from("events")
    .update({
      title: eventPayload.title ?? currentEvent.value.title,
      description: eventPayload.description ?? currentEvent.value.description ??
        "",
      date: eventPayload.date ?? currentEvent.value.date,
      status: eventPayload.status ?? currentEvent.value.status,
    })
    .eq("id", currentEvent.value.id)
    .select()
    .single();

  if (error) throw error;

  currentEvent.value = {
    ...currentEvent.value,
    title: data.title,
    description: data.description,
    date: data.date,
    status: data.status,
  };
};

// =========================================================
// AREA PUBLIK
// =========================================================
export const loadPublicEvent = async (eventId: string) => {
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;

  const { data: servicesData } = await supabase
    .from("services")
    .select("*")
    .eq("event_id", eventId);
  const { data: queuesData } = await supabase
    .from("queues")
    .select("*")
    .eq("event_id", eventId);

  currentEvent.value = {
    id: eventData.id,
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    status: eventData.status,
  };

  eventServices.value = (servicesData || []).map(mapService);
  eventQueues.value = (queuesData || []).map(mapQueue);
};

export const takeTicket = async (
  eventId: string,
  serviceId: number,
): Promise<TakeTicketResult> => {
  // Satu RPC call menggantikan 5-6 query sequential sebelumnya.
  // Semua logika (cek kuota, increment nomor, insert tiket, update queue)
  // berjalan dalam satu transaksi atomic di PostgreSQL — bebas race condition.
  const { data, error } = await supabase.rpc("take_ticket", {
    p_event_id: eventId,
    p_service_id: serviceId,
  });

  if (error) throw error;

  // RPC mengembalikan array kosong jika kuota penuh
  if (!data || (data as RpcTakeTicketRow[]).length === 0) return "FULL";

  const row = (data as RpcTakeTicketRow[])[0];

  // Update local state agar UI reaktif tanpa menunggu realtime
  const queueIndex = eventQueues.value.findIndex(
    (queue) => queue.serviceId === serviceId,
  );
  if (queueIndex !== -1) {
    eventQueues.value[queueIndex] = {
      ...eventQueues.value[queueIndex],
      totalWaiting: eventQueues.value[queueIndex].totalWaiting + 1,
    };
  }

  const serviceIndex = eventServices.value.findIndex(
    (service) => service.id === serviceId,
  );
  if (serviceIndex !== -1) {
    eventServices.value[serviceIndex] = {
      ...eventServices.value[serviceIndex],
      count: eventServices.value[serviceIndex].count + 1,
    };
  }

  const ticket = mapTicket({
    id: row.id,
    event_id: row.event_id,
    service_id: row.service_id,
    number: row.number,
    uuid: row.uuid,
    status: row.status,
    created_at: row.created_at,
  } as DbTicket);

  return {
    ticket,
    formattedNumber: `${row.service_prefix}-${
      ticket.yourNumber
        .toString()
        .padStart(3, "0")
    }`,
  };
};

export const loadPublicTicket = async (ticketUuid: string): Promise<Ticket> => {
  // Pakai RPC bukan direct table query — anon tidak bisa dump semua tiket
  const { data, error } = await supabase.rpc("get_ticket_by_uuid", {
    p_uuid: ticketUuid,
  });
  if (error) throw error;
  if (!data || (data as DbTicket[]).length === 0) {
    throw new Error("Tiket tidak ditemukan");
  }

  const ticketData = (data as DbTicket[])[0];
  await loadPublicEvent(ticketData.event_id);
  const ticket = mapTicket(ticketData);
  activeTicket.value = ticket;
  return ticket;
};

// =========================================================
// GUARD: Cek tiket aktif dari daftar UUID (batch query)
// ← Dipakai RegistrationPage untuk cek localStorage
// =========================================================
export const checkActiveTickets = async (
  uuids: Record<number, string>, // serviceId → ticketUuid
): Promise<Record<number, string>> => {
  const uuidList = Object.values(uuids);
  if (uuidList.length === 0) return {};

  // Pakai RPC bukan direct table query
  const { data } = await supabase.rpc("check_tickets_by_uuids", {
    p_uuids: uuidList,
  });

  const active: Record<number, string> = {};

  for (const [serviceIdStr, ticketUuid] of Object.entries(uuids)) {
    const serviceId = Number(serviceIdStr);
    const found = (data as { uuid: string; status: string }[] | null)?.find(
      (t) => t.uuid === ticketUuid,
    );

    // Tiket dianggap masih aktif jika waiting atau sudah dipanggil
    if (found?.status === "waiting" || found?.status === "called") {
      active[serviceId] = ticketUuid;
    }
  }

  return active;
};

// =========================================================
// REALTIME: Subscribe perubahan status tiket
// ← Dipakai DigitalTicket.vue
// Mengembalikan fungsi cleanup untuk dipanggil di onUnmounted
// =========================================================
export const subscribeToTicketStatus = (ticketUuid: string) => {
  const channel = supabase
    .channel(`ticket-status:${ticketUuid}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tickets",
        filter: `uuid=eq.${ticketUuid}`,
      },
      (payload) => {
        // Update activeTicket di store agar semua computed yang bergantung
        // padanya ikut reaktif tanpa perlu fetch ulang
        if (activeTicket.value?.ticketUuid === ticketUuid) {
          activeTicket.value = {
            ...activeTicket.value,
            status: (payload.new as DbTicket).status ?? "waiting",
          };
        }
      },
    )
    .subscribe();

  // Kembalikan cleanup function agar component bisa unsubscribe di onUnmounted
  return () => {
    void supabase.removeChannel(channel);
  };
};
// =========================================================
// REALTIME: Subscribe perubahan queue (current_number, status, total_waiting)
// ← Dipakai DigitalTicket.vue agar nomor sekarang auto-update
// =========================================================
export const subscribeToServiceQueue = (serviceId: number) => {
  const channelName = `queue-service:${serviceId}`;

  // Tambah guard yang sama
  const existingChannel = supabase
    .getChannels()
    .find((ch) => ch.topic === `realtime:${channelName}`);

  if (existingChannel) {
    return () => {
      void supabase.removeChannel(existingChannel);
    };
  }

  // INITIAL FETCH: Pastikan data antrian sudah ada di memori saat pertama kali
  // dibuka (misal: TeamConsole di HP yang tidak punya state Organizer).
  // Tanpa ini, eventQueues kosong dan tampilan tidak akan menampilkan data apapun
  // sampai ada perubahan realtime berikutnya.
  void supabase
    .from("queues")
    .select("*")
    .eq("service_id", serviceId)
    .maybeSingle()
    .then(({ data }) => {
      if (!data) return;
      const idx = eventQueues.value.findIndex(
        (q) => q.serviceId === data.service_id,
      );
      if (idx !== -1) {
        eventQueues.value[idx] = mapQueue(data as DbQueue);
      } else {
        eventQueues.value.push(mapQueue(data as DbQueue));
      }
    });

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "queues",
        filter: `service_id=eq.${serviceId}`,
      },
      (payload) => {
        const updated = payload.new as unknown as DbQueue;
        const idx = eventQueues.value.findIndex(
          (q) => q.serviceId === updated.service_id,
        );
        if (idx !== -1) {
          eventQueues.value[idx] = mapQueue(updated);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

export const subscribeToEventQueues = (
  eventId: string,
  onQueueUpdated?: (queue: QueueState) => void,
) => {
  const channel = supabase
    .channel(`queues-event:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "queues",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        const updated = mapQueue(payload.new as unknown as DbQueue);
        const idx = eventQueues.value.findIndex(
          (q) => q.serviceId === updated.serviceId,
        );

        if (idx !== -1) {
          eventQueues.value[idx] = updated;
        } else {
          eventQueues.value.push(updated);
        }

        onQueueUpdated?.(updated);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

export const subscribeToServiceUpdate = (eventId: string) => {
  const channel = supabase
    .channel(`services-event:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "services",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        const updated = payload.new as unknown as DbService;
        const idx = eventServices.value.findIndex((s) => s.id === updated.id);
        if (idx !== -1) {
          eventServices.value[idx] = mapService(updated);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

export const getWaitingCountBefore = async (
  serviceId: number,
  eventId: string,
  yourNumber: number,
): Promise<number> => {
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("service_id", serviceId)
    .eq("event_id", eventId)
    .eq("status", "waiting")
    .lt("number", yourNumber); // hanya tiket bernomor lebih kecil dari punyamu

  return count ?? 0;
};
