// File: src/data/types.ts

export type QuotaType = "unlimited" | "limited";
export type EventStatus = "live" | "draft" | "completed";
export type OperatorStatus = "idle" | "serving" | "closed";

export interface Service {
  count: number;
  eventId: string;
  id: number;
  name: string;
  prefix: string;
  status: "active" | "draft" | "finished";
  quotaLimit: number | string;
  quotaType: QuotaType;
}

export interface EventInfo {
  date: string;
  description?: string;
  id: string;
  status: EventStatus;
  title: string;
}

export interface QueueState {
  currentNumber: number;
  serviceId: number;
  status: OperatorStatus;
  totalWaiting: number;
}

export interface Ticket {
  createdAt: string;
  eventId: string;
  id: number;
  serviceId: number;
  status: "waiting" | "called" | "served" | "skipped";
  ticketUuid: string;
  yourNumber: number;
}

export interface ServicePointConfig {
  identifier: string;
  label: string;
  activeServiceId?: number;
}

export interface OrganizerAccount {
  email: string;
  id?: string;
  initials: string;
  name: string;
  organization: string;
  phone: string;
  role: string;
}

export type DbService = {
  count?: number | null;
  event_id: string;
  id: number;
  name: string;
  prefix: string;
  quota_limit: number | string | null;
  quota_type: QuotaType;
  status?: "active" | "draft" | "finished" | null;
};

export type DbQueue = {
  current_number?: number | null;
  event_id: string; // ← ditambah agar bisa dipakai saat update ticket status
  service_id: number;
  status?: OperatorStatus | null;
  total_waiting?: number | null;
};

// ← tambah status
export type DbTicket = {
  created_at: string;
  event_id: string;
  id: number;
  number: number;
  service_id: number;
  status: "waiting" | "called" | "served" | "skipped";
  uuid: string;
};

export type AddServicePayload = {
  eventId?: string;
  name: string;
  prefix: string;
  quotaType: QuotaType;
  quotaLimit: number | string;
};

export type TakeTicketResult =
  | "FULL"
  | {
      formattedNumber: string;
      ticket: Ticket;
    };
