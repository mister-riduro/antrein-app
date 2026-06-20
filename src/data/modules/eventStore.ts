import { ref } from "vue";
import type { EventInfo, Service, QueueState } from "../types";

export const currentEvent = ref<EventInfo>({
  id: "",
  title: "",
  description: "",
  date: "",
  status: "draft",
});

export const eventServices = ref<Service[]>([]);
export const eventQueues = ref<QueueState[]>([]);
