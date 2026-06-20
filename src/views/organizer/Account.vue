<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Building02Icon,
  Call02Icon,
  Mail01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import BaseInput from "../../components/ui/BaseInput.vue";
import {
  organizerAccount,
  updateOrganizerAccount,
} from "../../data/appStore.ts";
import { useToast } from "../../composables/useToast";

const toast = useToast();

const form = reactive({
  email: organizerAccount.value.email,
  name: organizerAccount.value.name,
  organization: organizerAccount.value.organization,
  phone: organizerAccount.value.phone,
  role: organizerAccount.value.role,
});

watch(
  organizerAccount,
  (account) => {
    form.email = account.email;
    form.name = account.name;
    form.organization = account.organization;
    form.phone = account.phone;
    form.role = account.role;
  },
  { immediate: true },
);

const nameError = computed(() => {
  return form.name.trim().length === 0 ? "Nama wajib diisi" : null;
});

const emailError = computed(() => {
  if (form.email.trim().length === 0) return "Email wajib diisi";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    return "Format email belum valid";
  }

  return null;
});

const isFormValid = computed(() => !nameError.value && !emailError.value);

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "A";
};

const saveAccount = async () => {
  if (!isFormValid.value) {
    toast.error(
      "Akun belum bisa disimpan",
      "Lengkapi nama dan email akun terlebih dahulu.",
    );
    return;
  }

  try {
    await updateOrganizerAccount({
      email: form.email.trim(),
      initials: getInitials(form.name),
      name: form.name.trim(),
      organization: form.organization.trim(),
      phone: form.phone.trim(),
      role: form.role.trim(),
    });

    toast.success(
      "Akun disimpan",
      "Informasi akun penyelenggara sudah diperbarui.",
    );
  } catch {
    toast.error("Gagal menyimpan akun", "Data akun belum tersimpan ke database.");
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-main tracking-tight">Akun</h1>
      <p class="text-text-muted text-sm mt-1">
        Kelola identitas penyelenggara yang digunakan di aplikasi.
      </p>
    </div>

    <section
      class="bg-surface border border-border-subtle rounded-xl shadow-sm overflow-hidden"
    >
      <div
        class="px-6 py-5 border-b border-border-subtle bg-gray-50/60 flex items-center gap-4"
      >
        <div
          class="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold"
        >
          {{ organizerAccount.initials }}
        </div>
        <div class="min-w-0">
          <h2 class="font-heading text-lg font-bold text-text-main truncate">
            {{ organizerAccount.name }}
          </h2>
          <p class="text-sm text-text-muted mt-1">
            {{ organizerAccount.role }} - {{ organizerAccount.organization }}
          </p>
        </div>
      </div>

      <form class="p-6 space-y-6" @submit.prevent="saveAccount">
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <BaseInput
            v-model="form.name"
            label="Nama Lengkap"
            placeholder="Contoh: Muhammad Ridlo"
            :error="nameError"
          />

          <BaseInput
            v-model="form.email"
            label="Email"
            placeholder="nama@email.com"
            :error="emailError"
          />

          <BaseInput
            v-model="form.phone"
            label="Nomor WhatsApp"
            placeholder="+62 812-0000-0000"
          />

          <BaseInput
            v-model="form.organization"
            label="Organisasi"
            placeholder="Nama organisasi"
          />

          <BaseInput
            v-model="form.role"
            label="Peran"
            placeholder="Administrator"
          />
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="rounded-lg border border-border-subtle bg-gray-50 px-4 py-3">
            <div class="flex items-center gap-2 text-xs text-text-muted">
              <HugeiconsIcon :icon="Mail01Icon" :size="16" :stroke-width="2" />
              Email
            </div>
            <p class="mt-2 text-sm font-semibold text-text-main truncate">
              {{ organizerAccount.email }}
            </p>
          </div>

          <div class="rounded-lg border border-border-subtle bg-gray-50 px-4 py-3">
            <div class="flex items-center gap-2 text-xs text-text-muted">
              <HugeiconsIcon :icon="Call02Icon" :size="16" :stroke-width="2" />
              WhatsApp
            </div>
            <p class="mt-2 text-sm font-semibold text-text-main truncate">
              {{ organizerAccount.phone }}
            </p>
          </div>

          <div class="rounded-lg border border-border-subtle bg-gray-50 px-4 py-3">
            <div class="flex items-center gap-2 text-xs text-text-muted">
              <HugeiconsIcon
                :icon="Building02Icon"
                :size="16"
                :stroke-width="2"
              />
              Organisasi
            </div>
            <p class="mt-2 text-sm font-semibold text-text-main truncate">
              {{ organizerAccount.organization }}
            </p>
          </div>
        </div>

        <div class="pt-4 border-t border-border-subtle flex justify-end">
          <button
            type="submit"
            :disabled="!isFormValid"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 py-2 text-sm font-medium text-white tactile-btn transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HugeiconsIcon :icon="UserCircleIcon" :size="18" :stroke-width="2" />
            Simpan Akun
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
