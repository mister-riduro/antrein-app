import { supabase } from "../services/supabaseClient";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useToast } from "./useToast";

const INDONESIAN_LANG = "id-ID";
const PREFERRED_VOICE_HINTS = ["google", "microsoft", "natural", "online"];
const STORAGE_KEY = "antrein.audioSettings";

export interface AudioSettings {
  elevenLabsModelId: string;
  elevenLabsVoiceId: string;
  enabled: boolean;
  pitch: number;
  provider: "browser" | "elevenlabs";
  rate: number;
  voiceName: string;
  volume: number;
}

const defaultSettings: AudioSettings = {
  elevenLabsModelId: "eleven_multilingual_v2",
  elevenLabsVoiceId: "",
  enabled: true,
  pitch: 1,
  provider: "browser",
  rate: 0.92,
  voiceName: "",
  volume: 1,
};

const settings = reactive<AudioSettings>({ ...defaultSettings });
const hasLoadedSettings = ref(false);
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

const isBrowserSpeechSupported = () => {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
};

const loadStoredSettings = () => {
  if (hasLoadedSettings.value || typeof window === "undefined") return;

  try {
    const rawSettings = window.localStorage.getItem(STORAGE_KEY);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      // Migrasi: buang key lama agar tidak masuk ke settings baru
      delete parsed.elevenLabsEndpoint;
      Object.assign(settings, { ...defaultSettings, ...parsed });
    }
  } catch {
    Object.assign(settings, defaultSettings);
  }

  hasLoadedSettings.value = true;
};

export const useIndonesianTts = () => {
  const isSupported = isBrowserSpeechSupported();
  const voices = ref<SpeechSynthesisVoice[]>([]);
  const isSpeaking = ref(false);
  const toast = useToast();

  const loadVoices = () => {
    if (!isSupported) return;
    voices.value = window.speechSynthesis.getVoices();
  };

  const indonesianVoices = computed(() =>
    voices.value.filter((voice) => voice.lang.toLowerCase().startsWith("id"))
  );

  const availableVoices = computed(() => {
    const indonesianVoiceNames = new Set(
      indonesianVoices.value.map((voice) => voice.name),
    );

    return [
      ...indonesianVoices.value,
      ...voices.value.filter((voice) => !indonesianVoiceNames.has(voice.name)),
    ];
  });

  const selectedVoice = computed(() => {
    if (settings.voiceName) {
      const configuredVoice = voices.value.find(
        (voice) => voice.name === settings.voiceName,
      );
      if (configuredVoice) return configuredVoice;
    }

    if (indonesianVoices.value.length === 0) return null;

    return (
      indonesianVoices.value.find((voice) =>
        PREFERRED_VOICE_HINTS.some((hint) =>
          voice.name.toLowerCase().includes(hint)
        )
      ) ||
      indonesianVoices.value.find(
        (voice) => voice.lang.toLowerCase() === INDONESIAN_LANG.toLowerCase(),
      ) ||
      indonesianVoices.value[0]
    );
  });

  // ← Diupdate: cek apiKey, bukan endpoint
  const statusLabel = computed(() => {
    if (!settings.enabled) return "Suara dimatikan";
    if (settings.provider === "elevenlabs") {
      if (!settings.elevenLabsVoiceId.trim()) return "Voice ID belum diatur";
      return "ElevenLabs siap";
    }
    if (!isSupported) return "Suara tidak didukung";
    if (selectedVoice.value?.lang.toLowerCase().startsWith("id")) {
      return "Suara Indonesia siap";
    }
    if (selectedVoice.value) return "Suara pilihan siap";
    if (voices.value.length > 0) return "Suara Indonesia belum tersedia";
    return "Memuat suara";
  });

  const cleanupAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  };

  const speakWithBrowser = (text: string) => {
    if (!isSupported) {
      toast.error(
        "Browser tidak mendukung suara",
        "Gunakan Chrome, Edge, atau browser modern lain untuk text-to-speech.",
      );
      return false;
    }

    cleanupAudio();
    window.speechSynthesis.cancel();

    const utterance = createBrowserUtterance(text);

    utterance.onstart = () => {
      isSpeaking.value = true;
      toast.success(
        "Suara pemanggilan diputar",
        "Browser sedang membacakan nomor antrean.",
      );
    };
    utterance.onend = () => {
      isSpeaking.value = false;
    };
    utterance.onerror = () => {
      isSpeaking.value = false;
      toast.error(
        "Gagal memutar suara",
        "Browser tidak berhasil membacakan antrean. Coba pilih suara lain di Pengaturan.",
      );
    };

    window.speechSynthesis.speak(utterance);
    return true;
  };

  const createBrowserUtterance = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice.value?.lang || INDONESIAN_LANG;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    if (selectedVoice.value) {
      utterance.voice = selectedVoice.value;
    }

    return utterance;
  };

  // ← Direfactor: handle SDK error format, bukan HTTP Response
  const getElevenLabsErrorMessage = (error: unknown): string => {
    // ElevenLabs SDK melempar error dengan property `status` dan `body`
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;

      if (typeof err.status === "number") {
        if (err.status === 401 || err.status === 403) {
          return "API Key ElevenLabs tidak valid atau ditolak. Periksa kembali di Pengaturan.";
        }
        if (err.status === 429) {
          return "Kuota ElevenLabs habis atau terlalu banyak request. Coba lagi nanti atau cek paket ElevenLabs.";
        }
        if (err.status >= 500) {
          return "Server ElevenLabs mengalami error. Coba lagi dalam beberapa saat.";
        }

        // Coba ambil detail dari body SDK error
        const body = err.body as Record<string, unknown> | undefined;
        if (typeof body?.detail === "string") return body.detail;
        if (typeof body?.message === "string") return body.message;
      }
    }

    if (!(error instanceof Error)) {
      return "Terjadi error saat membuat audio pemanggilan.";
    }

    const msg = error.message.toLowerCase();

    if (msg.includes("failed to fetch") || msg.includes("network error")) {
      return "Tidak bisa menghubungi ElevenLabs API. Periksa koneksi internet.";
    }

    if (msg.includes("api key") || msg.includes("unauthorized")) {
      return "API Key ElevenLabs tidak valid. Periksa kembali di halaman Pengaturan.";
    }

    return (
      error.message || "Terjadi error yang tidak diketahui saat memutar audio."
    );
  };

  // ← Direfactor: pakai ElevenLabsClient SDK, bukan fetch ke proxy backend
  // Di dalam useIndonesianTts.ts

  const speakWithElevenLabs = async (text: string) => {
    try {
      // Panggil Edge Function kita melalui Supabase Client
      const { data, error } = await supabase.functions.invoke("tts-provider", {
        body: {
          text: text,
          voiceId: settings.elevenLabsVoiceId,
        },
      });

      if (error) throw error;

      cleanupAudio();
      const audioBlob = new Blob([data], { type: "audio/mpeg" });
      currentAudioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(currentAudioUrl);

      // Sesuaikan nada dan kecepatan berdasarkan settings lokal pengguna
      currentAudio.playbackRate = settings.rate;
      // (Note: pengubahan pitch via HTML5 Audio agak kompleks, biasanya diabaikan atau ditangani di sisi ElevenLabs)
      currentAudio.onended = cleanupAudio;

      await currentAudio.play();
      return true;
    } catch (err) {
      console.error("Gagal memutar suara:", err);
      toast.error("Gagal Memutar Suara", getElevenLabsErrorMessage(err));
      return false;
    }
  };

  const speak = (text: string) => {
    if (!settings.enabled) {
      toast.info(
        "Suara pemanggilan dimatikan",
        "Aktifkan kembali dari halaman Pengaturan jika ingin memakai audio.",
      );
      return false;
    }

    if (!text.trim()) {
      toast.warning(
        "Teks pemanggilan kosong",
        "Tidak ada kalimat yang bisa dibacakan.",
      );
      return false;
    }

    if (settings.provider === "elevenlabs") {
      return speakWithElevenLabs(text);
    }

    return speakWithBrowser(text);
  };

  const speakAsync = async (text: string) => {
    if (!settings.enabled) {
      toast.info(
        "Suara pemanggilan dimatikan",
        "Aktifkan kembali dari halaman Pengaturan jika ingin memakai audio.",
      );
      return false;
    }

    if (!text.trim()) {
      toast.warning(
        "Teks pemanggilan kosong",
        "Tidak ada kalimat yang bisa dibacakan.",
      );
      return false;
    }

    if (settings.provider === "elevenlabs") {
      const didStart = await speakWithElevenLabs(text);
      if (!didStart || !currentAudio) return didStart;

      isSpeaking.value = true;
      return new Promise<boolean>((resolve) => {
        if (!currentAudio) {
          resolve(false);
          return;
        }

        currentAudio.onended = () => {
          isSpeaking.value = false;
          cleanupAudio();
          resolve(true);
        };
        currentAudio.onerror = () => {
          isSpeaking.value = false;
          cleanupAudio();
          resolve(false);
        };
      });
    }

    if (!isSupported) {
      toast.error(
        "Browser tidak mendukung suara",
        "Gunakan Chrome, Edge, atau browser modern lain untuk text-to-speech.",
      );
      return false;
    }

    cleanupAudio();
    window.speechSynthesis.cancel();

    const utterance = createBrowserUtterance(text);

    return new Promise<boolean>((resolve) => {
      utterance.onstart = () => {
        isSpeaking.value = true;
      };
      utterance.onend = () => {
        isSpeaking.value = false;
        resolve(true);
      };
      utterance.onerror = () => {
        isSpeaking.value = false;
        toast.error(
          "Gagal memutar suara",
          "Browser tidak berhasil membacakan antrean. Coba pilih suara lain di Pengaturan.",
        );
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const stop = () => {
    cleanupAudio();
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    isSpeaking.value = false;
  };

  onMounted(() => {
    loadStoredSettings();
    loadVoices();
    if (!isSupported) return;

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  });

  watch(
    settings,
    (nextSettings) => {
      if (!hasLoadedSettings.value || typeof window === "undefined") return;

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    },
    { deep: true },
  );

  onBeforeUnmount(() => {
    if (!isSupported) return;

    window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    stop();
  });

  return {
    availableVoices,
    indonesianVoices,
    isSpeaking,
    isSupported,
    selectedVoice,
    settings,
    speak,
    speakAsync,
    statusLabel,
    stop,
  };
};
