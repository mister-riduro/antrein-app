import { ref } from "vue";
import type { OrganizerAccount, ServicePointConfig } from "../types";

export const organizerAccount = ref<OrganizerAccount>({
  id: "",
  email: "",
  name: "",
  initials: "A",
  phone: "",
  organization: "",
  role: "",
});

export const servicePointConfig = ref<ServicePointConfig>({
  identifier: "1",
  label: "Loket",
});
