<script setup lang="ts">
import ToastContainer from "./components/ui/ToastContainer.vue";
</script>

<template>
  <div class="min-h-screen bg-[var(--color-surface)] font-sans text-gray-900">
    <router-view />
    <ToastContainer />
  </div>
</template>
