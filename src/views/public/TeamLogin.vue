<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div
      class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md"
    >
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Login Operator Tim
        </h1>
        <p class="text-gray-500 text-sm">
          Masukkan kode akses loket yang diberikan oleh Organizer.
        </p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label
            for="accessCode"
            class="block text-sm font-medium text-gray-700 mb-1"
            >Kode Akses</label
          >
          <input
            id="accessCode"
            v-model="accessCode"
            type="text"
            placeholder="Contoh: LOKET-A-123"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all uppercase"
            :disabled="isLoading"
          />
        </div>

        <!-- Pesan Error -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2"
        >
          <svg
            class="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <p>{{ errorMessage }}</p>
        </div>

        <button
          type="submit"
          :disabled="isLoading || !accessCode"
          class="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center disabled:opacity-70"
        >
          <span v-if="isLoading">Memverifikasi...</span>
          <span v-else>Masuk ke Loket</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
// Pastikan kamu sudah membuat file teamApi.ts yang berisi pemanggilan fungsi RPC
import { teamApi } from "../../services/teamApi";

const router = useRouter();
const route = useRoute();

const accessCode = ref("");
const isLoading = ref(false);
const errorMessage = ref("");

// Fitur Share Link: Otomatis mengisi kode jika operator membuka link dari Organizer
onMounted(() => {
  if (route.query.code) {
    accessCode.value = route.query.code as string;
  }
});

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    // Memanggil API layer (Clean Architecture)
    const data = await teamApi.loginOperator(accessCode.value);

    // Simpan ke sessionStorage
    sessionStorage.setItem("team_session_token", data.session_token);
    sessionStorage.setItem("team_assignment_id", data.assignment_id.toString());

    if (data.service_id) {
      sessionStorage.setItem("team_service_id", data.service_id.toString());
    }

    // PENTING: Simpan waktu kedaluwarsa agar layar TeamConsole bisa auto-kick
    if (data.expires_at) {
      sessionStorage.setItem("team_expires_at", data.expires_at);
    }

    // Arahkan ke layar pemanggilan
    router.push("/team/console");
  } catch (error: any) {
    errorMessage.value =
      error.message || "Gagal masuk. Periksa kembali kode akses.";
  } finally {
    isLoading.value = false;
  }
};
</script>
