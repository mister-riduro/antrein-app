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

        // RPC can return either a single row object or an array (TABLE/SETOF).
        // Normalize to a single row object.
        const row = Array.isArray(data) ? data[0] : data;

        if (!row || !row.assignment_id) {
            throw new Error("Kode akses tidak valid atau tidak ditemukan.");
        }

        const session_token = generateUUID();

        // Upsert session ke tabel operator_sessions agar Realtime jalan
        const { error: upsertError } = await supabase.from("operator_sessions").upsert({
            assignment_id: row.assignment_id,
            session_token: session_token,
            device_hint: navigator.userAgent.substring(0, 50),
            last_active: new Date().toISOString(),
        }, { onConflict: "assignment_id" });

        if (upsertError) throw new Error(upsertError.message);

        return { ...row, session_token };
    },
};
