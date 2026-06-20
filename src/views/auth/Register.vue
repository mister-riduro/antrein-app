<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import { useToast } from "../../composables/useToast";

const router = useRouter();
const auth = useAuth();
const toast = useToast();
const isSubmitting = ref(false);

const form = reactive({
  name: "",
  organizationName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
});

// Password requirements
const passwordRules = computed(() => [
  {
    id: "minLength",
    label: "Minimal 8 karakter",
    met: form.password.length >= 8,
  },
  {
    id: "hasUpper",
    label: "Mengandung huruf kapital (A-Z)",
    met: /[A-Z]/.test(form.password),
  },
  {
    id: "hasNumber",
    label: "Mengandung angka (0-9)",
    met: /[0-9]/.test(form.password),
  },
  {
    id: "hasSpecial",
    label: "Mengandung karakter khusus (!@#$...)",
    met: /[^A-Za-z0-9]/.test(form.password),
  },
]);

const passwordsMatch = computed(
  () =>
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword,
);

const passwordMismatch = computed(
  () =>
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword,
);

const allRulesMet = computed(() => passwordRules.value.every((r) => r.met));

const requiredFieldsFilled = computed(
  () =>
    form.name.trim().length > 0 &&
    form.organizationName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.email.trim().length > 0,
);

const isFormValid = computed(
  () => requiredFieldsFilled.value && allRulesMet.value && passwordsMatch.value,
);

const handleSubmit = async () => {
  if (isSubmitting.value) return;

  if (!isFormValid.value) {
    toast.error(
      "Kata sandi tidak valid",
      "Pastikan semua persyaratan kata sandi terpenuhi dan konfirmasi cocok.",
    );
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await auth.register({
      email: form.email,
      name: form.name,
      organizationName: form.organizationName,
      password: form.password,
      phone: form.phone,
    });

    if (result.needsEmailConfirmation) {
      toast.success(
        "Pendaftaran berhasil",
        "Silakan cek email untuk konfirmasi akun sebelum masuk.",
      );
      router.push({ name: "Login" });
      return;
    }

    router.push({ name: "MyEvents" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    toast.error("Gagal mendaftar", message);
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
        <h1 class="mt-8 text-2xl font-bold tracking-tight">Daftar</h1>
        <p class="mt-2 text-sm text-text-muted">
          Buat akun penyelenggara untuk mulai mengelola antrean.
        </p>
      </div>

      <form
        class="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm space-y-4"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label
            for="full-name"
            class="block text-sm font-medium text-text-main"
          >
            Nama Lengkap
          </label>
          <input
            id="full-name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Nama penanggung jawab"
          />
        </div>

        <div>
          <label
            for="organization-name"
            class="block text-sm font-medium text-text-main"
          >
            Nama Penyelenggara
          </label>
          <input
            id="organization-name"
            v-model="form.organizationName"
            type="text"
            autocomplete="organization"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Nama organisasi"
          />
        </div>

        <div>
          <label
            for="phone"
            class="block text-sm font-medium text-text-main"
          >
            Nomor Telepon
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="+62 812-0000-0000"
          />
        </div>

        <div>
          <label
            for="register-email"
            class="block text-sm font-medium text-text-main"
          >
            Email
          </label>
          <input
            id="register-email"
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
            for="register-password"
            class="block text-sm font-medium text-text-main"
          >
            Kata sandi
          </label>
          <input
            id="register-password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            class="mt-1 block w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            placeholder="Minimal 8 karakter"
          />
        </div>

        <!-- Confirm Password -->
        <div>
          <label
            for="register-confirm-password"
            class="block text-sm font-medium text-text-main"
          >
            Konfirmasi Kata Sandi
          </label>
          <input
            id="register-confirm-password"
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            :class="[
              'mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1',
              passwordMismatch
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400 bg-red-50'
                : passwordsMatch
                  ? 'border-green-400 focus:border-green-400 focus:ring-green-400 bg-green-50'
                  : 'border-border-subtle bg-white focus:border-brand-primary focus:ring-brand-primary',
            ]"
            placeholder="Ulangi kata sandi"
          />
          <p
            v-if="passwordMismatch"
            class="mt-1 text-xs text-red-500 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Kata sandi tidak cocok
          </p>
          <p
            v-else-if="passwordsMatch"
            class="mt-1 text-xs text-green-600 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Kata sandi cocok
          </p>
        </div>

        <!-- Password Requirements Checklist -->
        <div class="rounded-lg border border-border-subtle bg-surface p-3 space-y-1.5">
          <p class="text-xs font-medium text-text-muted mb-2">Persyaratan kata sandi:</p>
          <div
            v-for="rule in passwordRules"
            :key="rule.id"
            class="flex items-center gap-2 text-xs transition-colors duration-200"
            :class="rule.met ? 'text-green-600' : 'text-text-muted'"
          >
            <span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200"
              :class="rule.met ? 'bg-green-100' : 'bg-gray-100'"
            >
              <svg v-if="rule.met" xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ rule.label }}
          </div>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting || !isFormValid"
          :class="[
            'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm tactile-btn transition-all duration-200',
            isFormValid && !isSubmitting
              ? 'bg-brand-primary hover:bg-brand-primary-hover cursor-pointer'
              : 'bg-gray-300 cursor-not-allowed',
          ]"
        >
          {{ isSubmitting ? "Memproses..." : "Daftar" }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-text-muted">
        Sudah punya akun?
        <RouterLink
          to="/login"
          class="font-medium text-brand-primary hover:text-brand-primary-hover"
        >
          Masuk
        </RouterLink>
      </p>
    </section>
  </main>
</template>
