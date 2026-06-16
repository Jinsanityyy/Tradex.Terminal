import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Google Cloud TTS Wavenet voice — natural neural voice.
// Uses GEMINI_API_KEY (same Google account). Falls back to Google Translate TTS
// if the Cloud TTS API isn't enabled on the key.
async function googleCloudTTS(text: string): Promise<ArrayBuffer | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_CLOUD_TTS_KEY;
  if (!apiKey) return null;

  const body = {
    input: { text },
    voice: {
      languageCode: "en-US",
      name: "en-US-Wavenet-D", // Natural male voice
      ssmlGender: "MALE",
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.93,
      pitch: -1.5,
      volumeGainDb: 2.0,
    },
  };

  let res: Response;
  try {
    res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) return null;

  // audioContent is base64-encoded MP3
  const binary = Buffer.from(json.audioContent, "base64");
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

// Fallback: Google Translate TTS (free, no key, slightly robotic)
async function googleTranslateTTS(text: string): Promise<ArrayBuffer | null> {
  const url =
    "https://translate.google.com/translate_tts" +
    `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob&ttsspeed=0.9`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });
  } catch {
    return null;
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!res.ok || !ct.includes("audio")) return null;

  return res.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") ?? "").trim().slice(0, 200);
  if (!text) return new NextResponse(null, { status: 400 });

  const buf = (await googleCloudTTS(text)) ?? (await googleTranslateTTS(text));
  if (!buf) return new NextResponse(null, { status: 502 });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
