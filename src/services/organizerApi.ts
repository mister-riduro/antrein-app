// File: src/services/organizerApi.ts
import { supabase } from "./supabaseClient";

export const organizerApi = {
  async getAccount(userId: string) {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getConfig(userId: string) {
    const { data, error } = await supabase
      .from("service_point_configs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getLatestEvent(userId: string) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("organizer_id", userId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data?.[0] || null; // Kembalikan event pertama atau null jika kosong
  },

  async getEventDetails(eventId: string) {
    // Fetch parallel untuk services dan queues
    const [servicesResult, queuesResult] = await Promise.all([
      supabase.from("services").select("*").eq("event_id", eventId),
      supabase.from("queues").select("*").eq("event_id", eventId),
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (queuesResult.error) throw queuesResult.error;

    return {
      services: servicesResult.data,
      queues: queuesResult.data,
    };
  },
};
