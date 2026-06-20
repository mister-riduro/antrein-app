<script setup lang="ts">
import { computed } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import { VolumeHighIcon, VolumeMute02Icon } from "@hugeicons/core-free-icons";
import { useIndonesianTts } from "../../composables/useIndonesianTts.ts";
import {
  servicePointConfig,
  servicePointName,
  updateServicePointConfig,
} from "../../data/appStore.ts";

const {
  availableVoices,
  indonesianVoices,
  isSpeaking,
  isSupported,
  selectedVoice,
  settings,
  speak,
  statusLabel,
  stop,
} = useIndonesianTts();

const selectedVoiceDescription = computed(() => {
  if (selectedVoice.value) {
    return `${selectedVoice.value.name} (${selectedVoice.value.lang})`;
  }

  return "Browser akan mencoba memakai suara bahasa Indonesia otomatis.";
});

const isAudioTestDisabled = computed(() => {
  if (!settings.enabled) return true;
  if (settings.provider === "browser") return !isSupported;

  return settings.elevenLabsVoiceId.trim().length === 0;
});

const testAnnouncement = () => {
  speak(
    `Nomor antrean R 13. Silakan menuju ${servicePointName.value}. Layanan Registrasi.`,
  );
};

const saveServicePointConfig = () => {
  void updateServicePointConfig({
    identifier: servicePointConfig.value.identifier,
    label: servicePointConfig.value.label,
  });
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-main tracking-tight">
        Pengaturan
      </h1>
      <p class="text-text-muted text-sm mt-1">
        Atur preferensi aplikasi untuk pemanggilan antrean.
      </p>
    </div>

    <section
      class="bg-surface border border-border-subtle rounded-xl shadow-sm overflow-hidden"
    >
      <div class="px-6 py-4 border-b border-border-subtle bg-gray-50/60">
        <h2 class="font-heading font-semibold text-text-main">
          Titik Pemanggilan
        </h2>
        <p class="text-sm text-text-muted mt-1">
          Atur istilah tempat tujuan peserta saat nomor antrean dipanggil.
        </p>
      </div>

      <div class="p-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <label
            for="service-point-label"
            class="block text-sm font-medium text-text-main mb-1.5"
          >
            Istilah
          </label>
          <input
            id="service-point-label"
            v-model="servicePointConfig.label"
            @change="saveServicePointConfig"
            type="text"
            class="block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Loket, Ruangan, Meja"
          />
        </div>

        <div>
          <label
            for="service-point-identifier"
            class="block text-sm font-medium text-text-main mb-1.5"
          >
            Nomor atau nama
          </label>
          <input
            id="service-point-identifier"
            v-model="servicePointConfig.identifier"
            @change="saveServicePointConfig"
            type="text"
            class="block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="1, A, Barat"
          />
        </div>

        <div
          class="rounded-lg border border-border-subtle bg-gray-50 px-4 py-3 lg:col-span-2"
        >
          <p
            class="text-xs font-medium uppercase tracking-wide text-text-muted"
          >
            Preview
          </p>
          <p class="mt-1 text-sm font-semibold text-text-main">
            Silakan menuju {{ servicePointName }}.
          </p>
        </div>
      </div>
    </section>

    <section
      class="bg-surface border border-border-subtle rounded-xl shadow-sm overflow-hidden"
    >
      <div
        class="px-6 py-4 border-b border-border-subtle bg-gray-50/60 flex items-center justify-between gap-4"
      >
        <div>
          <h2 class="font-heading font-semibold text-text-main">
            Audio Pemanggilan
          </h2>
          <p class="text-sm text-text-muted mt-1">
            Konfigurasi suara yang dipakai operator saat memanggil peserta.
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
          :class="
            settings.enabled
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-gray-200 bg-gray-100 text-gray-600'
          "
        >
          {{ settings.enabled ? "Aktif" : "Mati" }}
        </span>
      </div>

      <div class="p-6 space-y-6">
        <div
          v-if="!isSupported"
          class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Browser ini belum mendukung text-to-speech. Gunakan Chrome, Edge, atau
          browser modern lain untuk memakai audio pemanggilan.
        </div>

        <label
          class="flex items-center justify-between gap-4 rounded-lg border border-border-subtle px-4 py-3"
        >
          <span>
            <span class="block text-sm font-medium text-text-main">
              Aktifkan suara pemanggilan
            </span>
            <span class="block text-sm text-text-muted mt-0.5">
              Jika dimatikan, tombol panggil tetap bekerja tanpa suara.
            </span>
          </span>
          <input
            v-model="settings.enabled"
            type="checkbox"
            class="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
        </label>

        <div>
          <label class="block text-sm font-medium text-text-main mb-2">
            Sumber suara
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="settings.provider = 'browser'"
              :aria-pressed="settings.provider === 'browser'"
              class="rounded-lg border px-4 py-3 text-left transition-colors"
              :class="
                settings.provider === 'browser'
                  ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                  : 'border-border-subtle bg-white text-text-muted hover:bg-gray-50'
              "
            >
              <span class="block text-sm font-semibold">Browser</span>
              <span class="mt-1 block text-xs">
                Gratis tanpa server, kualitas mengikuti perangkat.
              </span>
            </button>

            <!-- ← Update deskripsi: hapus "endpoint backend" -->
            <button
              type="button"
              @click="settings.provider = 'elevenlabs'"
              :aria-pressed="settings.provider === 'elevenlabs'"
              class="rounded-lg border px-4 py-3 text-left transition-colors"
              :class="
                settings.provider === 'elevenlabs'
                  ? 'border-brand-primary bg-brand-primary-light text-brand-primary'
                  : 'border-border-subtle bg-white text-text-muted hover:bg-gray-50'
              "
            >
              <span class="block text-sm font-semibold">ElevenLabs</span>
              <span class="mt-1 block text-xs">
                Kualitas lebih natural langsung via ElevenLabs SDK.
              </span>
            </button>
          </div>
        </div>

        <div
          v-if="settings.provider === 'elevenlabs'"
          class="rounded-xl border border-border-subtle bg-gray-50/60 p-4 space-y-4"
        >
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- ← Ganti: elevenLabsEndpoint → elevenLabsApiKey, type password -->

            <div>
              <label
                for="elevenlabs-voice-id"
                class="block text-sm font-medium text-text-main mb-1.5"
              >
                Voice ID
              </label>
              <input
                id="elevenlabs-voice-id"
                v-model="settings.elevenLabsVoiceId"
                type="text"
                class="block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="Contoh: JBFqnCBsd6RMkjVDRZzb"
              />
            </div>
          </div>
        </div>

        <div
          v-if="settings.provider === 'browser'"
          class="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          <div>
            <label
              for="voice"
              class="block text-sm font-medium text-text-main mb-1.5"
            >
              Suara
            </label>
            <select
              id="voice"
              v-model="settings.voiceName"
              :disabled="
                !isSupported ||
                !settings.enabled ||
                settings.provider !== 'browser'
              "
              class="block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Otomatis bahasa Indonesia</option>
              <option
                v-for="voice in availableVoices"
                :key="`${voice.name}-${voice.lang}`"
                :value="voice.name"
              >
                {{ voice.name }} - {{ voice.lang }}
              </option>
            </select>
            <p class="text-xs text-text-muted mt-2">
              {{ selectedVoiceDescription }}
            </p>
            <p
              v-if="isSupported && indonesianVoices.length === 0"
              class="text-xs text-amber-700 mt-2"
            >
              Suara Indonesia belum terdeteksi di browser ini. Tambahkan voice
              Indonesia di sistem operasi untuk hasil terbaik.
            </p>
          </div>

          <div class="rounded-lg border border-border-subtle p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-text-main">Status Audio</p>
                <p class="text-sm text-text-muted mt-1">{{ statusLabel }}</p>
              </div>
              <HugeiconsIcon
                :icon="settings.enabled ? VolumeHighIcon : VolumeMute02Icon"
                :size="28"
                class="text-brand-primary"
                :stroke-width="2"
              />
            </div>

            <div class="mt-4 flex gap-2">
              <button
                type="button"
                @click="testAnnouncement"
                :disabled="isAudioTestDisabled"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white tactile-btn hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Uji Suara
              </button>
              <button
                type="button"
                @click="stop"
                :disabled="!isSpeaking"
                class="inline-flex items-center justify-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-main tactile-btn hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hentikan
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-lg border border-border-subtle p-4 flex items-center justify-between gap-4"
        >
          <div>
            <p class="text-sm font-medium text-text-main">Status Audio</p>
            <p class="text-sm text-text-muted mt-1">{{ statusLabel }}</p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              @click="testAnnouncement"
              :disabled="isAudioTestDisabled"
              class="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white tactile-btn hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Uji Suara
            </button>
            <button
              type="button"
              @click="stop"
              :disabled="!isSpeaking"
              class="inline-flex items-center justify-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-main tactile-btn hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hentikan
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <div class="flex items-center justify-between">
              <label for="volume" class="text-sm font-medium text-text-main">
                Volume
              </label>
              <span class="text-sm font-semibold text-text-main">
                {{ Math.round(settings.volume * 100) }}%
              </span>
            </div>
            <input
              id="volume"
              v-model.number="settings.volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              :disabled="!settings.enabled"
              class="mt-3 w-full accent-brand-primary disabled:opacity-50"
            />
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label for="rate" class="text-sm font-medium text-text-main">
                Kecepatan
              </label>
              <span class="text-sm font-semibold text-text-main">
                {{ settings.rate.toFixed(2) }}x
              </span>
            </div>
            <input
              id="rate"
              v-model.number="settings.rate"
              type="range"
              min="0.7"
              max="1.2"
              step="0.01"
              :disabled="!settings.enabled"
              class="mt-3 w-full accent-brand-primary disabled:opacity-50"
            />
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label for="pitch" class="text-sm font-medium text-text-main">
                Nada
              </label>
              <span class="text-sm font-semibold text-text-main">
                {{ settings.pitch.toFixed(2) }}
              </span>
            </div>
            <input
              id="pitch"
              v-model.number="settings.pitch"
              type="range"
              min="0.8"
              max="1.2"
              step="0.01"
              :disabled="!settings.enabled"
              class="mt-3 w-full accent-brand-primary disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
