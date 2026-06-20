<script setup lang="ts">
import { HugeiconsIcon } from "@hugeicons/vue";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

defineProps<{
  isOpen: boolean;
  title: string;
}>();

defineEmits(["close"]);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <div class="absolute inset-y-0 right-0 max-w-full flex w-full md:w-96">
      <div class="h-full w-full bg-surface shadow-xl flex flex-col p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-heading font-semibold text-text-main">
            {{ title }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-text-muted hover:text-text-main transition-colors"
          >
            <HugeiconsIcon
              :icon="Cancel01Icon"
              :size="24"
              color="currentColor"
              :stroke-width="2"
            />
          </button>
        </div>

        <div class="p-2 flex-1 overflow-y-auto no-scrollbar">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS untuk menyembunyikan scrollbar */
.no-scrollbar::-webkit-scrollbar {
  display: none; /* Untuk Chrome, Safari, dan Opera */
}
.no-scrollbar {
  -ms-overflow-style: none; /* Untuk IE dan Edge */
  scrollbar-width: none; /* Untuk Firefox */
}
</style>
