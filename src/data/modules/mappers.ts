// File: src/data/modules/mappers.ts
// Pure functions — tidak ada side effect, tidak ada Supabase call

import type {
  DbQueue,
  DbService,
  DbTicket,
  QueueState,
  Service,
  Ticket,
} from "../types";

export const getInitials = (name: string, fallback = "A") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return initials || fallback;
};

export const mapService = (service: DbService): Service => ({
  id: service.id,
  eventId: service.event_id,
  name: service.name,
  prefix: service.prefix,
  quotaType: service.quota_type,
  quotaLimit: service.quota_limit ?? "",
  count: service.count || 0,
  status: service.status ?? "active",
});

export const mapQueue = (queue: DbQueue): QueueState => ({
  currentNumber: queue.current_number || 0,
  serviceId: queue.service_id,
  status: queue.status || "idle",
  totalWaiting: queue.total_waiting || 0,
});

export const mapTicket = (ticket: DbTicket): Ticket => ({
  id: ticket.id,
  eventId: ticket.event_id,
  serviceId: ticket.service_id,
  status: ticket.status || "waiting",
  ticketUuid: ticket.uuid,
  yourNumber: ticket.number,
  createdAt: ticket.created_at,
});

export const getEmptyQueue = (serviceId = 0): QueueState => ({
  currentNumber: 0,
  serviceId,
  status: "idle",
  totalWaiting: 0,
});
