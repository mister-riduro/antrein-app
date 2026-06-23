// File: src/data/modules/queueStore.ts

import { computed, ref } from "vue";
import { supabase } from "../../services/supabaseClient";
import { currentEvent, eventQueues, eventServices } from "./eventStore";
import type { DbQueue, QueueState, Service } from "../types";

// =========================================================
// STATE
// =========================================================
export const selectedServiceId = ref<number>(0);

// =========================================================
// COMPUTED
// =========================================================
export const assignedService = computed<Service>(() => {
  const found = eventServices.value.find(
    (s) => s.id === selectedServiceId.value,
  );
  return (
    found ||
    eventServices.value[0] || {
      count: 0,
      eventId: currentEvent.value.id,
      id: 0,
      name: "",
      prefix: "",
      quotaLimit: "",
      quotaType: "unlimited",
    }
  );
});

export const operatorQueue = computed(() =>
  getQueueByServiceId(assignedService.value.id)
);

// =========================================================
// UTILITIES
// =========================================================
export function getQueueByServiceId(serviceId: number): QueueState {
  return (
    eventQueues.value.find((q) => q.serviceId === serviceId) || {
      currentNumber: 0,
      serviceId,
      status: "idle",
      totalWaiting: 0,
    }
  );
}

export const getQueueStatusLabel = (status: "idle" | "serving" | "closed") => {
  if (status === "serving") return "Sedang Melayani";
  if (status === "closed") return "Ditutup";
  return "Menunggu";
};

export const getQueueStatusBadgeClass = (
  status: "idle" | "serving" | "closed",
) => {
  if (status === "serving") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "closed") return "border-red-200 bg-red-50 text-red-700";
  return "border-gray-200 bg-gray-100 text-gray-600";
};

export const getQueueStatusDotClass = (
  status: "idle" | "serving" | "closed",
) => {
  if (status === "serving") return "bg-green-500";
  if (status === "closed") return "bg-red-500";
  return "bg-gray-400";
};

// =========================================================
// OPERATOR ACTIONS
// =========================================================

// Guard: mencegah operator spam-klik saat action sedang diproses.
// Satu flag per-action — "call-next" tidak memblokir "finish", dll.
const actionInFlight = ref<Record<string, boolean>>({});

export const isActionLoading = (
  action: "call-next" | "finish" | "close" | "open" | "recall" | "skip",
) => actionInFlight.value[action] === true;

const postQueueAction = async (
  serviceId: number,
  action: "call-next" | "finish" | "close" | "open" | "recall" | "skip",
) => {
  if (!serviceId) throw new Error("Layanan belum dipilih");
  if (actionInFlight.value[action]) return; // Sudah ada yang jalan, abaikan

  actionInFlight.value[action] = true;

  const { data: queueData, error: queueError } = await supabase
    .from("queues")
    .select("*")
    .eq("service_id", serviceId)
    .single();

  if (queueError) throw queueError;

  const updatedQueue = { ...queueData } as DbQueue & {
    current_number: number;
    total_waiting: number;
  };

  if (action === "call-next") {
    const previousNumber = updatedQueue.current_number || 0;
    const isImplicitFinish = queueData.status === "serving";

    const { data: nextTicket } = await supabase
      .from("tickets")
      .select("number")
      .eq("event_id", queueData.event_id)
      .eq("service_id", serviceId)
      .eq("status", "waiting")
      .gt("number", previousNumber)
      .order("number", { ascending: true })
      .limit(1)
      .maybeSingle();

    updatedQueue.current_number = nextTicket
      ? nextTicket.number
      : previousNumber + 1;
    updatedQueue.status = "serving";

    const ticketUpdates: PromiseLike<unknown>[] = [
      supabase
        .from("tickets")
        .update({ status: "called" })
        .eq("event_id", queueData.event_id)
        .eq("service_id", serviceId)
        .eq("number", updatedQueue.current_number),
    ];

    if (
      isImplicitFinish &&
      previousNumber > 0 &&
      previousNumber !== updatedQueue.current_number
    ) {
      ticketUpdates.push(
        supabase
          .from("tickets")
          .update({ status: "served" })
          .eq("event_id", queueData.event_id)
          .eq("service_id", serviceId)
          .eq("number", previousNumber),
      );
    }

    await Promise.all(ticketUpdates);
  } else if (action === "finish") {
    if ((queueData.current_number || 0) > 0) {
      await supabase
        .from("tickets")
        .update({ status: "served" })
        .eq("event_id", queueData.event_id)
        .eq("service_id", serviceId)
        .eq("number", queueData.current_number);
    }
    updatedQueue.total_waiting = Math.max(
      0,
      (updatedQueue.total_waiting || 0) - 1,
    );
    updatedQueue.status = "idle";
  } else if (action === "close") {
    updatedQueue.status = "closed";
  } else if (action === "open") {
    updatedQueue.status = "idle";
  } else if (action === "recall") {
    updatedQueue.status = "serving";
  } else if (action === "skip") {
    if ((queueData.current_number || 0) > 0) {
      await supabase
        .from("tickets")
        .update({ status: "skipped" })
        .eq("event_id", queueData.event_id)
        .eq("service_id", serviceId)
        .eq("number", queueData.current_number);
    }
    updatedQueue.total_waiting = Math.max(
      0,
      (updatedQueue.total_waiting || 0) - 1,
    );
    updatedQueue.status = "idle";
  }

  try {
    const { error: updateError } = await supabase
      .from("queues")
      .update({
        current_number: updatedQueue.current_number,
        total_waiting: updatedQueue.total_waiting,
        status: updatedQueue.status,
      })
      .eq("service_id", serviceId);

    if (updateError) throw updateError;

    const queueIndex = eventQueues.value.findIndex(
      (q) => q.serviceId === serviceId,
    );
    if (queueIndex !== -1) {
      eventQueues.value[queueIndex] = {
        ...eventQueues.value[queueIndex],
        currentNumber: updatedQueue.current_number ?? 0,
        status: updatedQueue.status ?? "idle",
        totalWaiting: updatedQueue.total_waiting ?? 0,
      };
    }

    return updatedQueue;
  } finally {
    // Selalu reset flag — baik sukses maupun error
    actionInFlight.value[action] = false;
  }
};

export const callNextNumber = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "call-next");
export const finishServingNumber = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "finish");
export const closeCounter = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "close");
export const openCounter = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "open");
export const recallNumber = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "recall");
export const skipServingNumber = (serviceId = assignedService.value.id) =>
  postQueueAction(serviceId, "skip");
