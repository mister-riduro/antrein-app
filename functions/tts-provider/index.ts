// supabase/functions/tts-provider/index.ts
// @ts-nocheck

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_MODEL_ID = "eleven_v3"; // fixed sesuai keputusanmu

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    // Browser selalu kirim preflight OPTIONS dulu sebelum POST — wajib di-handle
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!ELEVENLABS_API_KEY) {
            throw new Error(
                "ELEVENLABS_API_KEY belum diset di environment Edge Function ini",
            );
        }

        const { text, voiceId } = await req.json();

        if (!text || typeof text !== "string") {
            return new Response(
                JSON.stringify({ error: "Parameter 'text' wajib diisi" }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        if (!voiceId || typeof voiceId !== "string") {
            return new Response(
                JSON.stringify({ error: "Parameter 'voiceId' wajib diisi" }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const elevenLabsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "audio/mpeg",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: ELEVENLABS_MODEL_ID,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            },
        );

        if (!elevenLabsResponse.ok) {
            const errorBody = await elevenLabsResponse.text();
            console.error(
                "ElevenLabs error:",
                elevenLabsResponse.status,
                errorBody,
            );

            return new Response(
                JSON.stringify({
                    error: "Gagal membuat audio dari ElevenLabs",
                    status: elevenLabsResponse.status,
                    detail: errorBody,
                }),
                {
                    status: elevenLabsResponse.status,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const audioBuffer = await elevenLabsResponse.arrayBuffer();

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/octet-stream",
            },
        });
    } catch (err) {
        console.error("tts-provider error:", err);
        return new Response(
            JSON.stringify({
                error: err instanceof Error
                    ? err.message
                    : "Internal Server Error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
