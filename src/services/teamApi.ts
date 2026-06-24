import { supabase } from "./supabaseClient";

function generateUUID() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Fallback untuk konteks tidak aman (HTTP / non-localhost)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export const teamApi = {
    async loginOperator(accessCode: string) {
        const { data, error } = await supabase.rpc("verify_team_code", {
            p_code: accessCode,
        });

        if (error) throw new Error(error.message);

        // RPC mengembalikan assignment_id, service_id, dan expires_at
        // Kita generate token session baru di sini atau di RPC (sesuai setup awalmu)
        const session_token = generateUUID();

        // Jangan lupa upsert session ke tabel operator_sessions agar Realtime jalan
        await supabase.from("operator_sessions").upsert({
            assignment_id: data.assignment_id,
            session_token: session_token,
            device_hint: navigator.userAgent.substring(0, 50),
            last_active: new Date().toISOString(),
        }, { onConflict: "assignment_id" });

        return { ...data, session_token };
    },
};
