import { computed, ref } from "vue";
import { supabase } from "../services/supabaseClient";

export interface AuthUser {
  email: string;
  id: string;
  initials: string;
  name: string;
  organization: string;
  phone: string;
  role: string;
}

interface UserProfile {
  email: string;
  id: string;
  initials?: string;
  name?: string;
  organization?: string;
  phone?: string;
  role?: string;
}

interface RegisterPayload {
  email: string;
  name: string;
  organizationName: string;
  password: string;
  phone: string;
}

export interface RegisterResult {
  needsEmailConfirmation: boolean;
  user: AuthUser | null;
}

const user = ref<AuthUser | null>(null);
const isInitialized = ref(false);
let initializationPromise: Promise<AuthUser | null> | null = null;

const setUser = (nextUser: AuthUser | null) => {
  user.value = nextUser;
};

const getInitials = (name: string, fallbackEmail: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || fallbackEmail.substring(0, 2).toUpperCase();
};

const mapUserProfile = (userProfile: UserProfile): AuthUser => ({
  email: userProfile.email,
  id: userProfile.id,
  initials: userProfile.initials ||
    getInitials(userProfile.name || "", userProfile.email),
  name: userProfile.name || "",
  organization: userProfile.organization || "",
  phone: userProfile.phone || "",
  role: userProfile.role || "organizer",
});

const fetchCurrentUser = async () => {
  // Get the current authenticated user from Supabase
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    setUser(null);
    isInitialized.value = true;
    return null;
  }

  // Fetch user profile from public.users table
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userProfile) {
    const mappedUser = mapUserProfile(userProfile);
    setUser(mappedUser);
    return mappedUser;
  }

  return null;
};

const initAuth = async () => {
  if (isInitialized.value) return user.value;

  initializationPromise ||= fetchCurrentUser().finally(() => {
    initializationPromise = null;
  });

  return initializationPromise;
};

const login = async (payload: { email: string; password: string }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed");

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (userProfile) {
    const mappedUser = mapUserProfile(userProfile);
    setUser(mappedUser);
    isInitialized.value = true;
    return mappedUser;
  }

  throw new Error("User profile not found");
};

const register = async (payload: RegisterPayload): Promise<RegisterResult> => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedName = payload.name.trim();
  const normalizedOrganization = payload.organizationName.trim();
  const normalizedPhone = payload.phone.trim();
  const initials = getInitials(normalizedName, normalizedEmail);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: payload.password,
    options: {
      data: {
        name: normalizedName,
        organization: normalizedOrganization,
        phone: normalizedPhone,
        role: "organizer",
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Registration failed");

  // Supabase returns a user with empty identities when the email already exists
  // (instead of throwing an error, for security reasons)
  if (
    data.user.identities &&
    data.user.identities.length === 0
  ) {
    throw new Error(
      "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
  }

  if (!data.session) {
    setUser(null);
    isInitialized.value = true;
    return {
      needsEmailConfirmation: true,
      user: null,
    };
  }

  const profile = {
    id: data.user.id,
    email: normalizedEmail,
    name: normalizedName,
    organization: normalizedOrganization,
    role: "organizer",
    initials,
    phone: normalizedPhone,
  };
  const organizationProfile = {
    id: data.user.id,
    email: normalizedEmail,
    name: normalizedName,
    organization: normalizedOrganization,
    role: "organizer",
    phone: normalizedPhone,
  };

  const { error: userProfileError } = await supabase
    .from("users")
    .upsert(profile, { onConflict: "id" });

  if (userProfileError) throw new Error(userProfileError.message);

  const { error: organizationError } = await supabase
    .from("organizations")
    .upsert(organizationProfile, { onConflict: "id" });

  if (organizationError) throw new Error(organizationError.message);

  const { error: configError } = await supabase
    .from("service_point_configs")
    .upsert(
      {
        user_id: data.user.id,
        identifier: "1",
        label: "Loket",
      },
      { onConflict: "user_id" },
    );

  if (configError) throw new Error(configError.message);

  // Fetch the created user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (userProfile) {
    const mappedUser = mapUserProfile(userProfile);
    setUser(mappedUser);
    isInitialized.value = true;
    return {
      needsEmailConfirmation: false,
      user: mappedUser,
    };
  }

  throw new Error("User profile creation failed");
};

const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  // Reset semua state organizer (event, queues, account, realtime channels)
  // sebelum clear user — supaya tidak ada data lama tersisa
  const { resetOrganizerState } = await import("../data/appStore");
  resetOrganizerState();
  setUser(null);
  isInitialized.value = true;
};

export const useAuth = () => {
  return {
    initAuth,
    isAuthenticated: computed(() => Boolean(user.value)),
    isInitialized,
    login,
    logout,
    register,
    setUser,
    user,
  };
};
