import { supabase } from "../services/supabaseClient";

export type AnnouncementStatus = "completed" | "failed";

export type AnnouncementStatusPayload = {
  currentNumber: number;
  message?: string;
  sentAt: string;
  serviceId: number;
  status: AnnouncementStatus;
};

const ANNOUNCEMENT_STATUS_EVENT = "announcement_status";
const CHANNEL_READY_TIMEOUT_MS = 3000;

const getAnnouncementStatusChannelName = (serviceId: number) =>
  `announcement-status:${serviceId}`;

const isAnnouncementStatusPayload = (
  payload: unknown,
): payload is AnnouncementStatusPayload => {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Partial<AnnouncementStatusPayload>;
  return (
    typeof data.serviceId === "number" &&
    Number.isFinite(data.serviceId) &&
    typeof data.currentNumber === "number" &&
    Number.isFinite(data.currentNumber) &&
    (data.status === "completed" || data.status === "failed") &&
    typeof data.sentAt === "string" &&
    (data.message === undefined || typeof data.message === "string")
  );
};

export const subscribeToAnnouncementStatus = (
  serviceId: number,
  onStatus: (payload: AnnouncementStatusPayload) => void,
) => {
  if (!Number.isFinite(serviceId) || serviceId <= 0) return () => {};

  const channel = supabase
    .channel(getAnnouncementStatusChannelName(serviceId))
    .on("broadcast", { event: ANNOUNCEMENT_STATUS_EVENT }, ({ payload }) => {
      if (!isAnnouncementStatusPayload(payload)) return;
      if (payload.serviceId !== serviceId) return;

      onStatus(payload);
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

export const createAnnouncementStatusPublisher = () => {
  const channels = new Map<
    number,
    {
      channel: ReturnType<typeof supabase.channel>;
      ready: Promise<void>;
    }
  >();

  const getChannelState = (serviceId: number) => {
    const existing = channels.get(serviceId);
    if (existing) return existing;

    const channel = supabase.channel(getAnnouncementStatusChannelName(serviceId));
    const ready = new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(resolve, CHANNEL_READY_TIMEOUT_MS);

      channel.subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          clearTimeout(timeoutId);
          resolve();
        }
      });
    });

    const channelState = { channel, ready };
    channels.set(serviceId, channelState);
    return channelState;
  };

  const publish = async (
    payload: Omit<AnnouncementStatusPayload, "sentAt">,
  ) => {
    if (!Number.isFinite(payload.serviceId) || payload.serviceId <= 0) return;
    if (!Number.isFinite(payload.currentNumber) || payload.currentNumber <= 0) {
      return;
    }

    const { channel, ready } = getChannelState(payload.serviceId);
    await ready;
    await channel.send({
      type: "broadcast",
      event: ANNOUNCEMENT_STATUS_EVENT,
      payload: {
        ...payload,
        sentAt: new Date().toISOString(),
      },
    });
  };

  const cleanup = () => {
    channels.forEach(({ channel }) => {
      void supabase.removeChannel(channel);
    });
    channels.clear();
  };

  return { cleanup, publish };
};
