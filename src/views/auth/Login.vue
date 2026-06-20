<script setup lang="ts">
import { reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import { useToast } from "../../composables/useToast";

const router = useRouter();
const route = useRoute();
const auth = useAuth();
const toast = useToast();
const isSubmitting = ref(false);

const form = reactive({
  email: "",
  password: "",
});

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    await auth.login({
      email: form.email,
      password: form.password,
    });
    router.push(String(route.query.redirect || "/events"));
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    toast.error("Gagal masuk", message);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <main
    class="min-h-screen bg-canvas text-text-main flex items-center justify-center px-4 py-10 font-sans"
  >
    <section class="w-full max-w-sm">
      <div class="mb-8">
        <RouterLink
          to="/events"
          class="inline-flex items-center text-2xl font-heading font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          AntreIn
        </RouterLink>
        <h1 class="mt-8 text-2xl font-bold tracking-tight">Masuk</h1>
        <p class="mt-2 text-sm text-text-muted">
          Masuk untuk mengelola kegiatan dan antrean Anda.
        </p>
      </div>

      <form
        class="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label for="email" class="block text-sm font-medium text-text-main">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="penyelenggara@example.com"
          />
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-text-main"
          >
          Kata sandi
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Masukkan kata sandi"
          />
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm tactile-btn hover:bg-brand-primary-hover"
        >
          {{ isSubmitting ? "Memproses..." : "Masuk" }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-text-muted">
        Belum punya akun?
        <RouterLink
          to="/register"
          class="font-medium text-brand-primary hover:text-brand-primary-hover"
        >
          Daftar
        </RouterLink>
      </p>
    </section>
  </main>
</template>
