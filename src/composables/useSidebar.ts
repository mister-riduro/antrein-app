import { ref, watch } from "vue";

// Singleton — satu state dipakai semua component yang mengimport composable ini
const isCollapsed = ref(localStorage.getItem("sidebar-collapsed") === "true");

watch(isCollapsed, (val) => {
  localStorage.setItem("sidebar-collapsed", String(val));
});

export const useSidebar = () => {
  const toggle = () => {
    isCollapsed.value = !isCollapsed.value;
  };

  return { isCollapsed, toggle };
};
