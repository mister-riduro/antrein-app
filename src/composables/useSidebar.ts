import { ref, watch } from "vue";

// Singleton — satu state dipakai semua component yang mengimport composable ini
const isCollapsed = ref(localStorage.getItem("sidebar-collapsed") === "true");

// State khusus mobile: apakah drawer sidebar sedang terbuka?
const isMobileOpen = ref(false);

watch(isCollapsed, (val) => {
  localStorage.setItem("sidebar-collapsed", String(val));
});

// Tutup mobile drawer otomatis jika layar melebar melewati breakpoint md
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", (e) => {
    if (e.matches) isMobileOpen.value = false;
  });
}

export const useSidebar = () => {
  const toggle = () => {
    if (window.innerWidth < 768) {
      // Mobile: toggle drawer overlay
      isMobileOpen.value = !isMobileOpen.value;
    } else {
      // Desktop: toggle collapsed width
      isCollapsed.value = !isCollapsed.value;
    }
  };

  const closeMobile = () => {
    isMobileOpen.value = false;
  };

  return { isCollapsed, isMobileOpen, toggle, closeMobile };
};
