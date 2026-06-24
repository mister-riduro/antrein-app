<template>
  <div class="space-y-6 p-6 max-w-6xl mx-auto">
    <div
      class="bg-white p-6 rounded-2xl shadow-sm border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h2 class="text-xl font-bold text-text-main">Manajemen Tim Operator</h2>
        <p class="text-sm text-text-muted mt-1">
          Pilih kegiatan untuk mengelola kode akses loket.
        </p>
      </div>

      <div class="w-full md:w-72">
        <select
          v-model="selectedEventId"
          @change="handleEventChange"
          class="w-full px-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all font-medium text-text-main"
        >
          <option value="" disabled>-- Pilih Kegiatan --</option>
          <option v-for="event in events" :key="event.id" :value="event.id">
            {{ event.title }}
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="!selectedEventId"
      class="bg-white border border-border-subtle rounded-2xl p-12 text-center shadow-sm"
    >
      <div
        class="w-16 h-16 bg-brand-primary-light text-brand-primary rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          ></path>
        </svg>
      </div>
      <h3 class="text-lg font-bold text-text-main mb-2">
        Pilih Kegiatan Terlebih Dahulu
      </h3>
      <p class="text-text-muted text-sm max-w-md mx-auto">
        Untuk melihat daftar operator atau membuat kode akses baru, silakan
        pilih salah satu kegiatan dari menu dropdown di atas.
      </p>
    </div>

    <div v-else class="space-y-4 animate-fade-in">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-bold text-text-main">Daftar Kode Akses</h3>
        <button
          @click="showCreateModal = true"
          class="bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center gap-2 tactile-btn shadow-sm"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Buat Kode Akses
        </button>
      </div>

      <div
        class="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-sm"
      >
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="bg-surface border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider"
            >
              <th class="p-4">Kode Akses</th>
              <th class="p-4">Akses Layanan</th>
              <th class="p-4">Berlaku Hingga</th>
              <th class="p-4">Status Sesi</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle text-sm text-text-main">
            <tr
              v-for="assignment in assignments"
              :key="assignment.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td
                class="p-4 font-mono font-bold text-brand-primary tracking-wider"
              >
                {{ assignment.access_code }}
              </td>
              <td class="p-4">
                <span
                  v-if="assignment.services"
                  class="bg-brand-primary-light text-brand-primary px-2.5 py-1 rounded-md text-xs font-semibold"
                >
                  {{ assignment.services.name }}
                </span>
                <span
                  v-else
                  class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold"
                >
                  Semua Layanan
                </span>
              </td>
              <td class="p-4 text-text-muted">
                {{ formatDate(assignment.expires_at) }}
              </td>
              <td class="p-4">
                <span
                  v-if="assignment.operator_sessions"
                  class="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium"
                >
                  <span
                    class="w-2 h-2 rounded-full bg-green-500 animate-pulse"
                  ></span>
                  Aktif ({{
                    assignment.operator_sessions.device_hint || "Perangkat"
                  }})
                </span>
                <span
                  v-else
                  class="text-xs text-text-muted flex items-center gap-1.5"
                >
                  <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                  Belum Terpakai
                </span>
              </td>
              <td class="p-4 text-right flex items-center justify-end gap-3">
                <button
                  @click="copyShareLink(assignment.access_code)"
                  class="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark transition-colors bg-brand-primary-light px-3 py-1.5 rounded-lg"
                >
                  Salin Link
                </button>

                <button
                  @click="revokeAccess(assignment.id)"
                  class="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Hapus
                </button>
              </td>
            </tr>
            <tr v-if="assignments.length === 0">
              <td colspan="5" class="p-12 text-center text-text-muted">
                Belum ada kode akses yang dibuat untuk kegiatan ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-gray-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
    >
      <div
        class="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl animate-fade-in"
      >
        <h3 class="text-lg font-bold text-text-main mb-6">
          Generate Kode Akses Tim
        </h3>

        <form @submit.prevent="createAssignment" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-text-main mb-1.5"
              >Batasi Akses Layanan</label
            >
            <select
              v-model="form.serviceId"
              class="w-full px-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all"
            >
              <option :value="null">Semua Layanan (Akses Penuh)</option>
              <option
                v-for="service in availableServices"
                :key="service.id"
                :value="service.id"
              >
                {{ service.name }}
              </option>
            </select>
            <p class="text-xs text-text-muted mt-1.5">
              Pilih layanan spesifik jika operator hanya bertugas di satu loket
              tertentu.
            </p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-text-main mb-1.5"
              >Masa Berlaku Kode</label
            >
            <input
              type="datetime-local"
              v-model="form.expiresAt"
              required
              class="w-full px-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all"
            />
          </div>

          <div
            class="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-6"
          >
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-gray-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors tactile-btn shadow-sm"
            >
              {{ isSubmitting ? "Memproses..." : "Generate Kode" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../services/supabaseClient";
import { getEventsForDropdown } from "../../services/organizerApi";
import { useToast } from "../../composables/useToast"; // Jika kamu pakai useToast

const toast = useToast();
// States
const selectedEventId = ref<string>("");
const assignments = ref<any[]>([]);
const availableServices = ref<any[]>([]);

const showCreateModal = ref(false);
const isSubmitting = ref(false);
const form = ref({
  serviceId: null as number | null,
  expiresAt: "",
});

// lifecycle hook didefinisikan di bawah

// 1. Fetch daftar Event saat halaman dimuat
// Ambil fungsi 'error' dari useToast milikmu

// States (Tetap simpan tipe datanya secara strict seperti ini ya)
interface EventItem {
  id: string;
  title: string;
}
const events = ref<EventItem[]>([]);

const fetchEvents = async () => {
  try {
    // Memanggil API layer
    const data = await getEventsForDropdown();

    // Jika berhasil, masukkan ke state lokal
    if (data) {
      events.value = data;
    }
  } catch (err: any) {
    console.error("Gagal mengambil event:", err);

    // Gunakan fungsi error bawaan dari useToast kamu
    toast.error("Gagal memuat kegiatan", "Periksa koneksi internet Anda.");
  }
};

// 2. Handler ketika user memilih Event dari Dropdown
const handleEventChange = async () => {
  if (!selectedEventId.value) {
    localStorage.removeItem("selected_event_team_id");
    return;
  }

  localStorage.setItem("selected_event_team_id", selectedEventId.value);

  // Reset form dan data tabel
  assignments.value = [];
  availableServices.value = [];
  form.value.serviceId = null;

  // Ambil layanan (services) yang terhubung ke event ini
  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("event_id", selectedEventId.value);
  if (services) availableServices.value = services;

  // Ambil kode akses (assignments) yang sudah ada untuk event ini
  await fetchAssignments();
};

// 3. Fetch data kode akses untuk event yang sedang dipilih
const fetchAssignments = async () => {
  const { data } = await supabase
    .from("team_assignments")
    .select(
      `
      id, access_code, expires_at,
      services ( name ),
      operator_sessions ( device_hint )
    `,
    )
    .eq("event_id", selectedEventId.value)
    .order("created_at", { ascending: false });

  if (data) assignments.value = data;
};

// 4. Generate Kode Baru
const createAssignment = async () => {
  if (!selectedEventId.value) return;

  isSubmitting.value = true;
  try {
    const randomCode =
      "ANT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from("team_assignments").insert({
      event_id: selectedEventId.value,
      service_id: form.value.serviceId,
      access_code: randomCode,
      expires_at: new Date(form.value.expiresAt).toISOString(),
    });

    if (error) throw error;

    showCreateModal.value = false;
    form.value.serviceId = null;
    form.value.expiresAt = "";

    // Refresh tabel
    await fetchAssignments();
  } catch (err) {
    console.error("Gagal membuat kode akses:", err);
  } finally {
    isSubmitting.value = false;
  }
};

// 5. Cabut Akses (Revoke)
const revokeAccess = async (id: number) => {
  if (
    !confirm(
      "Cabut kode akses ini? Operator yang sedang aktif di loket ini akan otomatis terputus.",
    )
  )
    return;

  const { error } = await supabase
    .from("team_assignments")
    .delete()
    .eq("id", id);

  if (!error) await fetchAssignments();
};

// Helper: Format Tanggal
const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const copyShareLink = async (code: string) => {
  const url = `${window.location.origin}/team/login?code=${code}`;

  // 1. Coba gunakan Clipboard API modern (Jika HTTPS / localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Berhasil", "Link berhasil disalin ke clipboard."); // Ganti dengan toast.success milikmu jika ada
      return;
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  }

  // 2. Fallback: Cara klasik jika diakses lewat IP lokal / HTTP
  try {
    // Buat elemen textarea tak kasat mata
    const textArea = document.createElement("textarea");
    textArea.value = url;

    // Cegah layar bergeser (scrolling) saat fokus
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      toast.success("Berhasil", "Link berhasil disalin."); // Ganti dengan toast.success
    } else {
      toast.error("Gagal", "Browser tidak mendukung salin link otomatis.");
    }
  } catch (err) {
    console.error("Fallback gagal menyalin:", err);
    toast.error("Gagal", "Gagal menyalin link.");
  }
};

onMounted(async () => {
  await fetchEvents();
  const savedEventId = localStorage.getItem("selected_event_team_id");
  if (savedEventId && events.value.some((e) => e.id === savedEventId)) {
    selectedEventId.value = savedEventId;
    await handleEventChange();
  }
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
