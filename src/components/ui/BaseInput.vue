<script setup lang="ts">
import { useId } from "vue";
const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    placeholder?: string;
    type?: "text" | "number" | "date";
    error?: string | null;
    min?: number;
    max?: number;
    maxlength?: number; // Tambahan untuk membatasi panjang karakter
    uppercase?: boolean; // Tambahan untuk auto-uppercase
    required?: boolean;
  }>(),
  {
    type: "text",
    required: false,
    uppercase: false, // Default tidak di-uppercase
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
}>();

const inputId = useId();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (props.type === "number") {
    emit(
      "update:modelValue",
      Number.isNaN(target.valueAsNumber) ? 0 : target.valueAsNumber,
    );
  } else {
    let val = target.value;

    // Jika prop uppercase bernilai true, ubah secara real-time
    if (props.uppercase) {
      val = val.toUpperCase();
      // Paksa DOM langsung update agar tidak ada "kedipan" huruf kecil ke besar di layar
      target.value = val;
    }

    emit("update:modelValue", val);
  }
};
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1.5"
    >
      {{ label }}
    </label>
    <input
      :id="inputId"
      :value="modelValue"
      @input="handleInput"
      :type="type"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :maxlength="maxlength"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all resize-none"
    />
    <p v-if="error" :id="`${inputId}-error`" class="mt-1 text-xs text-red-500">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
/* Hapus spinner input number secara total */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
