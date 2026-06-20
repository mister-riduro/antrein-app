<script setup lang="ts">
import { computed } from "vue";
import type { EventStatus } from "../../data/appStore";
import { currentEvent, eventServices } from "../../data/appStore";
import {
  getEventStatusBadgeClass,
  getEventStatusLabel,
} from "../../utils/eventStatus";

interface EventListItem {
  date: string;
  id: string;
  name: string;
  participants: string;
  status: EventStatus;
}

const totalUsedQuota = computed(() =>
  eventServices.value.reduce((total, service) => total + service.count, 0),
);

const totalQuotaLimit = computed(() =>
  eventServices.value.reduce((total, service) => {
    if (service.quotaType === "unlimited") return total;
    return total + Number(service.quotaLimit || 0);
  }, 0),
);

const participantsLabel = computed(() => {
  if (totalQuotaLimit.value === 0) return `${totalUsedQuota.value}`;
  return `${totalUsedQuota.value}/${totalQuotaLimit.value}`;
});

const events = computed<EventListItem[]>(() => {
  if (!currentEvent.value.id) return [];

  return [
    {
      date: currentEvent.value.date,
      id: currentEvent.value.id,
      name: currentEvent.value.title,
      participants: participantsLabel.value,
      status: currentEvent.value.status,
    },
  ];
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-main tracking-tight">
          Daftar Kegiatan
        </h1>
        <p class="text-text-muted text-sm mt-1">
          Kelola dan pantau semua kegiatan antrean Anda.
        </p>
      </div>
      <router-link
        to="/events/create"
        class="bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg font-medium tactile-btn text-sm shadow-sm flex items-center gap-2"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4v16m8-8H4"
          ></path>
        </svg>
        Buat Kegiatan
      </router-link>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        class="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm"
      >
        <div class="text-text-muted text-sm font-medium mb-1">
          Total Kegiatan
        </div>
        <div class="text-3xl font-bold text-text-main">{{ events.length }}</div>
      </div>
      <div
        class="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm"
      >
        <div class="text-text-muted text-sm font-medium mb-1">Sedang Aktif</div>
        <div class="text-3xl font-bold text-green-600 flex items-center gap-2">
          {{ currentEvent.status === "live" ? 1 : 0 }}
          <span class="flex h-3 w-3 relative"
            ><span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
            ></span
            ><span
              class="relative inline-flex rounded-full h-3 w-3 bg-green-500"
            ></span
          ></span>
        </div>
      </div>
      <div
        class="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm"
      >
        <div class="text-text-muted text-sm font-medium mb-1">
          Total Kuota Terpakai
        </div>
        <div class="text-3xl font-bold text-text-main">
          {{ totalUsedQuota }}
          <span
            v-if="totalQuotaLimit > 0"
            class="text-sm font-normal text-text-muted"
          >
            / {{ totalQuotaLimit }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm"
    >
      <div class="px-6 py-4 border-b border-border-subtle bg-gray-50/50">
        <h2 class="text-sm font-semibold text-text-main">Daftar Kegiatan</h2>
      </div>

      <div v-if="events.length > 0" class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-xs text-text-muted border-b border-border-subtle">
              <th class="px-6 py-3 font-medium">Nama Kegiatan</th>
              <th class="px-6 py-3 font-medium">Tanggal</th>
              <th class="px-6 py-3 font-medium">Peserta</th>
              <th class="px-6 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-border-subtle">
            <tr
              v-for="event in events"
              :key="event.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-text-main">
                {{ event.name }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-text-muted">
                  <span>{{ event.date }}</span>
                  <span
                    class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium"
                    :class="getEventStatusBadgeClass(event.status)"
                  >
                    {{ getEventStatusLabel(event.status) }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-text-muted">
                {{ event.participants }}
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <router-link
                  :to="`/events/${event.id}`"
                  class="inline-flex items-center justify-center p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                  title="Kelola layanan"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="1.75"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="py-16 px-6 text-center">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4"
        >
          <svg
            class="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-text-main">Belum ada kegiatan</h3>
        <p class="text-text-muted mt-1 max-w-sm mx-auto text-sm">
          Mulai atur antrean Anda dengan membuat kegiatan pertama. Cepat dan
          mudah.
        </p>
        <router-link
          to="/events/create"
          class="mt-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 tactile-btn"
        >
          Buat Kegiatan Sekarang
        </router-link>
      </div>
    </div>
  </div>
</template>
