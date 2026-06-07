/**
 * Telegram Bot API wrapper for TradeX Terminal channel alerts.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

/**
 * Send a message to the configured Telegram channel.
 * Returns true on success, false on failure (never throws).
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[telegram] sendMessage failed (${res.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[telegram] sendMessage error:", err);
    return false;
  }
}
