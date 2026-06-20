<script setup lang="ts">
import { onMounted } from "vue";
import Sidebar from "../components/ui/Sidebar.vue";
import Topbar from "../components/ui/Topbar.vue";
import { loadOrganizerState } from "../data/appStore";

onMounted(() => {
  void loadOrganizerState();
});
</script>

<template>
  <div class="flex h-screen bg-canvas font-sans text-text-main overflow-hidden">
    <!-- Sidebar Kiri -->
    <Sidebar />

    <!-- Area Kanan (Topbar + Konten Dinamis) -->
    <div class="flex flex-col flex-1 min-w-0">
      <Topbar />

      <!-- Canvas Utama -->
      <main class="flex-1 overflow-y-auto p-8">
        <div class="max-w-6xl mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
