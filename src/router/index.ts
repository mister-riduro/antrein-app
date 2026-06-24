import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useAuth } from "../composables/useAuth";
import { loadOrganizerState } from "../data/appStore";

const routes: Array<RouteRecordRaw> = [
  // ==========================================
  // AREA PUBLIK & AUTENTIKASI
  // ==========================================
  {
    path: "/login",
    name: "Login",
    meta: { guestOnly: true },
    component: () => import("../views/auth/Login.vue"),
  },
  {
    path: "/register",
    name: "RegisterSaaS",
    meta: { guestOnly: true },
    component: () => import("../views/auth/Register.vue"), // Pendaftaran Akun Organizer
  },

  // ==========================================
  // AREA ORGANIZER (EVENT MANAGEMENT)
  // Layout ini nantinya akan memiliki Sidebar navigasi persisten
  // ==========================================
  {
    path: "/",
    component: () => import("../layouts/OrganizerLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "/",
        redirect: { name: "MyEvents" },
      },
      {
        path: "events",
        name: "MyEvents",
        component: () => import("../views/organizer/MyEvents.vue"),
      },
      {
        path: "events/create",
        name: "EventCreate",
        component: () => import("../views/organizer/EventCreate.vue"), // Sesuai FR-2.1 (Halaman Baru)
      },
      {
        path: "events/:id/settings",
        name: "EventSettings",
        component: () => import("../views/organizer/EventSettings.vue"),
      },
      {
        path: "events/:id",
        name: "EventDetail",
        component: () => import("../views/organizer/EventDetail.vue"), // Sesuai FR-2.2 (Di dalamnya ada tab Manajemen Layanan & Slide-over)
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("../views/organizer/Settings.vue"),
      },
      {
        path: "account",
        name: "Account",
        component: () => import("../views/organizer/Account.vue"),
      },

      {
        path: "/team",
        name: "TeamManagement",
        component: () => import("../views/organizer/EventTeam.vue"),
        // Pastikan ada auth guard jika diperlukan
      },
    ],
  },

  // ==========================================
  // AREA PELAKSANAAN (OPERATOR & PUBLIC DISPLAY)
  // Desain Distraction-free, tanpa navigasi global
  // ==========================================
  {
    path: "/operator/event/:eventId/service/:serviceId",
    name: "OperatorConsole",
    meta: { requiresAuth: true },
    component: () => import("../views/execution/OperatorConsole.vue"), // Sesuai FR-4.1
  },
  {
    path: "/tv/:eventId",
    name: "PublicDisplay",
    meta: { requiresAuth: true },
    component: () => import("../views/execution/PublicDisplay.vue"), // Sesuai FR-5.1
  },

  // ==========================================
  // AREA TIM (LOGIN & CONSOLE)
  // ==========================================
  {
    path: "/team/login",
    name: "TeamLogin",
    component: () => import("../views/public/TeamLogin.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/team/console",
    name: "TeamConsole",
    component: () => import("../views/execution/TeamConsole.vue"),
    // Pelindung rute khusus untuk konsol tim
    beforeEnter: (_to, _from, next) => {
      // Cek apakah ada token di tab session ini
      const hasSession = sessionStorage.getItem("team_session_token");
      const hasAssignment = sessionStorage.getItem("team_assignment_id");

      if (!hasSession || !hasAssignment) {
        // Jika tidak ada token, kembalikan ke halaman input kode
        next({ name: "TeamLogin" });
      } else {
        // Jika ada, izinkan masuk ke halaman console
        next();
      }
    },
  },

  // ==========================================
  // AREA PESERTA (PENDAFTARAN & TIKET)
  // ==========================================
  {
    // Menggunakan UUID event agar link pendaftaran publik aman
    path: "/p/:eventUuid/join",
    name: "PublicRegistration",
    component: () => import("../views/public/RegistrationPage.vue"), // Sesuai FR-3.1
  },
  {
    path: "/ticket/:ticketUuid",
    name: "DigitalTicket",
    component: () => import("../views/public/DigitalTicket.vue"), // Sesuai FR-3.3
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuth();
  const user = await auth.initAuth();

  if (to.meta.requiresAuth && !user) {
    return { name: "Login" };
  }
  if (to.meta.guestOnly && user) {
    return { name: "MyEvents" };
  }

  // OPTIMASI: Jalankan loadOrganizerState secara non-blocking
  if (user) {
    // Kita tidak menggunakan 'await' di sini agar router bisa langsung
    // memindahkan halaman tanpa menunggu proses jaringan selesai.
    loadOrganizerState().catch((error) => {
      console.error("Failed to load application state:", error);
    });
  }

  return true;
});
export default router;
