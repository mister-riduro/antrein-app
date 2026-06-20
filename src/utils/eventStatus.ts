import type { EventStatus } from "../data/appStore";

export const getEventStatusLabel = (status: EventStatus) => {
  if (status === "live") return "Aktif";
  if (status === "completed") return "Selesai";
  return "Draf";
};

export const getEventStatusBadgeClass = (status: EventStatus) => {
  if (status === "live") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "completed") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  return "bg-yellow-50 text-yellow-700 border-yellow-200";
};

export const getEventStatusDotClass = (status: EventStatus) => {
  if (status === "live") return "bg-green-500";
  if (status === "completed") return "bg-gray-500";
  return "bg-yellow-500";
};
