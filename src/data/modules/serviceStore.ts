import { supabase } from "../../services/supabaseClient";
import { eventServices, eventQueues, currentEvent } from "./eventStore";
import { mapService, mapQueue } from "./mappers";
import type { AddServicePayload } from "../types";

export async function addServiceToEvent(payload: AddServicePayload) {
  const eventId = payload.eventId || currentEvent.value.id;
  if (!eventId) throw new Error("Kegiatan belum dipilih");

  const { data: newService, error: serviceError } = await supabase
    .from("services")
    .insert({
      event_id: eventId,
      name: payload.name,
      prefix: payload.prefix,
      quota_type: payload.quotaType,
      quota_limit: payload.quotaLimit === "" ? null : payload.quotaLimit,
      count: 0,
    })
    .select("*")
    .single();

  if (serviceError) throw serviceError;

  const { data: newQueue, error: queueError } = await supabase
    .from("queues")
    .insert({
      event_id: eventId,
      service_id: newService.id,
      current_number: 0,
      status: "idle",
      total_waiting: 0,
    })
    .select("*")
    .single();

  if (queueError) throw queueError;

  eventServices.value.push(mapService(newService));
  eventQueues.value.push(mapQueue(newQueue));

  return newService;
}

// Fungsi untuk mengubah/mengedit data Layanan
export async function updateService(
  serviceId: number,
  updates: {
    name: string;
    prefix: string;
    quota_limit: number | null;
    quota_type: "unlimited" | "limited";
  },
) {
  const { data, error } = await supabase
    .from("services")
    .update({
      name: updates.name,
      prefix: updates.prefix,
      quota_limit: updates.quota_limit,
      quota_type: updates.quota_type,
    })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    console.error("Gagal mengubah layanan:", error);
    throw error;
  }

  // Perbarui state lokal di frontend
  const idx = eventServices.value.findIndex((s) => s.id === serviceId);
  if (idx !== -1) {
    eventServices.value[idx] = mapService(data);
  }
}

// Fungsi untuk menghapus Layanan beserta semua relasi data secara sekuensial
export async function deleteService(serviceId: number) {
  // 1. Hapus semua tiket yang merujuk ke serviceId ini
  const { error: ticketError } = await supabase
    .from("tickets")
    .delete()
    .eq("service_id", serviceId);

  if (ticketError) throw ticketError;

  // 2. Hapus data antrean loket (queues) yang berjalan untuk serviceId ini
  const { error: queueError } = await supabase
    .from("queues")
    .delete()
    .eq("service_id", serviceId);

  if (queueError) throw queueError;

  // 3. Hapus data layanan utama dari tabel services
  const { error: serviceError } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (serviceError) {
    console.error("Gagal menghapus layanan:", serviceError);
    throw serviceError;
  }

  // Perbarui state lokal di frontend dengan membuang layanan yang dihapus
  eventServices.value = eventServices.value.filter((s) => s.id !== serviceId);
}
