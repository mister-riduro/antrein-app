<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Layers01Icon,
  PlusSignIcon,
  Calendar01Icon,
  UserGroupIcon,
  UserAccountIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { useSidebar } from "../../composables/useSidebar";
import { useAuth } from "../../composables/useAuth";
import ConfirmationDialog from "./ConfirmationDialog.vue";

const route = useRoute();
const router = useRouter();
const { isCollapsed } = useSidebar();
const { logout } = useAuth();

const isActive = (path: string) => route.path.startsWith(path);

const isLoggingOut = ref(false);
const showLogoutConfirm = ref(false);

const handleLogout = () => {
  showLogoutConfirm.value = true;
};

const confirmLogout = async () => {
  showLogoutConfirm.value = false;
  isLoggingOut.value = true;
  try {
    await logout();
    await router.push({ name: "Login" });
  } catch (err) {
    console.error("Logout gagal:", err);
  } finally {
    isLoggingOut.value = false;
  }
};
</script>

<template>
  <aside
    class="bg-surface border-r border-border-subtle flex flex-col h-screen sticky top-0 font-sans select-none transition-all duration-300 ease-in-out overflow-hidden"
    :class="isCollapsed ? 'w-16' : 'w-60'"
  >
    <!-- Header -->
    <div
      class="h-14 flex items-center border-b border-border-subtle shrink-0"
      :class="isCollapsed ? 'justify-center px-0' : 'px-4 justify-between'"
    >
      <router-link
        to="/events"
        :title="isCollapsed ? 'AntreIn' : undefined"
        class="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
      >
        <HugeiconsIcon
          :icon="Layers01Icon"
          :size="24"
          class="text-brand-primary shrink-0"
          :stroke-width="2"
        />
        <span
          v-if="!isCollapsed"
          class="text-xl font-heading font-bold tracking-tight text-text-main truncate"
        >
          AntreIn
        </span>
      </router-link>
    </div>

    <!-- Buat Kegiatan -->
    <div class="p-3 shrink-0">
      <router-link
        to="/events/create"
        title="Buat Kegiatan"
        class="flex items-center rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white tactile-btn shadow-sm transition-colors"
        :class="
          isCollapsed
            ? 'justify-center p-2.5'
            : 'gap-2 px-4 py-2.5 text-sm font-medium'
        "
      >
        <HugeiconsIcon
          :icon="PlusSignIcon"
          :size="18"
          :stroke-width="2"
          class="shrink-0"
        />
        <span v-if="!isCollapsed">Buat Kegiatan</span>
      </router-link>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 space-y-0.5 overflow-y-auto">
      <router-link
        to="/events"
        title="Daftar Kegiatan"
        class="flex items-center rounded-md transition-colors"
        :class="[
          isCollapsed
            ? 'justify-center p-2.5'
            : 'gap-3 px-3 py-2 text-sm font-medium',
          isActive('/events')
            ? 'bg-brand-primary-light text-brand-primary'
            : 'text-text-muted hover:bg-gray-100 hover:text-text-main',
        ]"
      >
        <HugeiconsIcon
          :icon="Calendar01Icon"
          :size="20"
          :stroke-width="2"
          class="shrink-0"
        />
        <span v-if="!isCollapsed">Daftar Kegiatan</span>
      </router-link>

      <!-- Tim -->
      <router-link
        to="/team"
        title="Tim Operator"
        class="flex items-center rounded-md transition-colors text-sm font-medium"
        :class="[
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
          isActive('/team')
            ? 'bg-brand-primary-light text-brand-primary'
            : 'text-text-muted hover:bg-gray-100 hover:text-text-main',
        ]"
      >
        <HugeiconsIcon
          :icon="UserGroupIcon"
          :size="20"
          :stroke-width="2"
          class="shrink-0"
        />
        <span v-if="!isCollapsed" class="flex items-center flex-1 gap-2">
          Tim Operator
        </span>
      </router-link>
    </nav>

    <!-- Bottom -->
    <div class="p-2 border-t border-border-subtle space-y-0.5 shrink-0">
      <!-- Akun -->
      <router-link
        to="/account"
        title="Akun"
        class="flex items-center rounded-md transition-colors text-sm font-medium"
        :class="[
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
          isActive('/account')
            ? 'bg-brand-primary-light text-brand-primary'
            : 'text-text-muted hover:bg-gray-100 hover:text-text-main',
        ]"
      >
        <HugeiconsIcon
          :icon="UserAccountIcon"
          :size="20"
          :stroke-width="2"
          class="shrink-0"
        />
        <span v-if="!isCollapsed">Akun</span>
      </router-link>

      <!-- Pengaturan -->
      <router-link
        to="/settings"
        title="Pengaturan"
        class="flex items-center rounded-md transition-colors text-sm font-medium"
        :class="[
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
          isActive('/settings')
            ? 'bg-brand-primary-light text-brand-primary'
            : 'text-text-muted hover:bg-gray-100 hover:text-text-main',
        ]"
      >
        <HugeiconsIcon
          :icon="Settings01Icon"
          :size="20"
          :stroke-width="2"
          class="shrink-0"
        />
        <span v-if="!isCollapsed">Pengaturan</span>
      </router-link>

      <!-- Keluar -->
      <button
        type="button"
        title="Keluar"
        :disabled="isLoggingOut"
        class="w-full flex items-center rounded-md transition-colors text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'"
        @click="handleLogout"
      >
        <HugeiconsIcon
          :icon="Logout01Icon"
          :size="20"
          :stroke-width="2"
          class="shrink-0"
          :class="{ 'animate-pulse': isLoggingOut }"
        />
        <span v-if="!isCollapsed">
          {{ isLoggingOut ? "Keluar..." : "Keluar" }}
        </span>
      </button>
    </div>
  </aside>

  <ConfirmationDialog
    :is-open="showLogoutConfirm"
    variant="danger"
    title="Keluar dari AntreIn?"
    description="Kamu akan keluar dari sesi ini. Pastikan semua kegiatan sudah selesai atau ditangani operator lain sebelum keluar."
    confirm-label="Ya, Keluar"
    cancel-label="Batal"
    @close="showLogoutConfirm = false"
    @confirm="confirmLogout"
  />
</template>
