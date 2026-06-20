<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Search01Icon,
  HelpCircleIcon,
  Menu01Icon, // ← tambah ini
} from "@hugeicons/core-free-icons";
import { organizerAccount } from "../../data/appStore.ts";
import { useSidebar } from "../../composables/useSidebar"; // ← tambah ini
import HelpDialog from "./HelpDialog.vue";

const isHelpDialogOpen = ref(false);
const { toggle } = useSidebar(); // ← ambil toggle saja, tidak perlu isCollapsed
</script>

<template>
  <header
    class="h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-4 sticky top-0 z-10 gap-3"
  >
    <!-- Toggle sidebar -->
    <button
      @click="toggle"
      class="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-text-muted hover:bg-gray-100 hover:text-text-main transition-colors"
      title="Toggle sidebar"
    >
      <HugeiconsIcon :icon="Menu01Icon" :size="18" :stroke-width="2" />
    </button>

    <!-- Search -->
    <div class="flex items-center flex-1 max-w-md">
      <div class="relative w-full">
        <div
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <HugeiconsIcon
            :icon="Search01Icon"
            :size="16"
            :stroke-width="2"
            class="text-gray-400"
          />
        </div>
        <input
          type="text"
          placeholder="Cari kegiatan, layanan..."
          class="block w-full pl-9 pr-12 py-1.5 bg-gray-50 border border-border-subtle rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        />
        <div
          class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none"
        >
          <span
            class="text-xs text-gray-400 font-medium bg-white px-1.5 py-0.5 rounded border border-border-subtle"
          >
            Ctrl K
          </span>
        </div>
      </div>
    </div>

    <!-- Right actions -->
    <div class="flex items-center space-x-4 shrink-0">
      <button
        type="button"
        @click="isHelpDialogOpen = true"
        class="text-sm font-medium text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors"
      >
        <HugeiconsIcon :icon="HelpCircleIcon" :size="20" :stroke-width="2" />
        Bantuan
      </button>
      <button
        class="text-sm font-medium text-text-muted hover:text-text-main border border-border-subtle px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
      >
        Tingkatkan
      </button>
      <RouterLink
        to="/account"
        aria-label="Buka halaman akun"
        title="Akun"
        class="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all"
      >
        {{ organizerAccount.initials }}
      </RouterLink>
    </div>

    <HelpDialog :is-open="isHelpDialogOpen" @close="isHelpDialogOpen = false" />
  </header>
</template>
