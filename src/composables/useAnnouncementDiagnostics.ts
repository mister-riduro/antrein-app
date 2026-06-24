import { onBeforeUnmount } from "vue";
import { useToast } from "./useToast";
import {
  subscribeToAnnouncementStatus,
  type AnnouncementStatusPayload,
} from "./useAnnouncementStatus";

type AnnouncementNumber = {
  currentNumber: number;
  serviceId: number;
};

const CONFIRMATION_TIMEOUT_MS = 45000;

const getAnnouncementKey = ({ currentNumber, serviceId }: AnnouncementNumber) =>
  `${serviceId}:${currentNumber}`;

export const useAnnouncementDiagnostics = (
  formatNumber: (announcement: AnnouncementNumber) => string,
) => {
  const toast = useToast();
  const pendingConfirmations = new Map<string, number>();
  const unsubscribeFns: Array<() => void> = [];

  const clearPendingConfirmation = (key: string) => {
    const timeoutId = pendingConfirmations.get(key);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      pendingConfirmations.delete(key);
    }
  };

  const handleStatus = (payload: AnnouncementStatusPayload) => {
    const key = getAnnouncementKey(payload);
    if (!pendingConfirmations.has(key)) return;

    clearPendingConfirmation(key);
    const formattedNumber = formatNumber(payload);

    if (payload.status === "completed") {
      toast.success(
        "Suara Display Diputar",
        `Nomor ${formattedNumber} sudah selesai diputar di Public Display.`,
      );
      return;
    }

    toast.error(
      "Suara Display Gagal",
      payload.message ||
        `Public Display tidak berhasil memutar suara untuk nomor ${formattedNumber}.`,
    );
  };

  const subscribeToService = (serviceId: number) => {
    if (!Number.isFinite(serviceId) || serviceId <= 0) return;

    unsubscribeFns.push(subscribeToAnnouncementStatus(serviceId, handleStatus));
  };

  const trackAnnouncement = (serviceId: number, currentNumber: number) => {
    if (
      !Number.isFinite(serviceId) ||
      serviceId <= 0 ||
      !Number.isFinite(currentNumber) ||
      currentNumber <= 0
    ) {
      return;
    }

    const announcement = { currentNumber, serviceId };
    const key = getAnnouncementKey(announcement);
    clearPendingConfirmation(key);

    const timeoutId = window.setTimeout(() => {
      if (!pendingConfirmations.has(key)) return;

      pendingConfirmations.delete(key);
      toast.warning(
        "Belum Ada Konfirmasi Suara",
        `Belum ada konfirmasi dari Public Display untuk nomor ${formatNumber(
          announcement,
        )}. Pastikan layar display terbuka dan koneksinya aktif.`,
      );
    }, CONFIRMATION_TIMEOUT_MS);

    pendingConfirmations.set(key, timeoutId);
    toast.info(
      "Pemanggilan Dikirim",
      `Menunggu konfirmasi suara dari Public Display untuk nomor ${formatNumber(
        announcement,
      )}.`,
    );
  };

  const cleanup = () => {
    pendingConfirmations.forEach((timeoutId) => clearTimeout(timeoutId));
    pendingConfirmations.clear();
    unsubscribeFns.forEach((unsubscribe) => unsubscribe());
    unsubscribeFns.length = 0;
  };

  onBeforeUnmount(cleanup);

  return {
    cleanup,
    subscribeToService,
    trackAnnouncement,
  };
};
