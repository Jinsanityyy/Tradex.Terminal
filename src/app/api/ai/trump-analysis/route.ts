import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { posts, avgImpact } = await req.json();
  
  const headlines = posts.slice(0, 8).map((p: any) => 
    `[${p.policyCategory} · ${p.impactScore}/10] ${p.content}`
  ).join("\n");

  const hasSpeech = posts.some((p: any) => 
    p.content.toLowerCase().includes("speak") ||
    p.content.toLowerCase().includes("said") ||
    p.policyCategory.toLowerCase().includes("speech")
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: "You are a concise market intelligence analyst. Focus on Gold (XAUUSD) and USD impact. No fluff. Respond only with valid JSON.",
      messages: [{
        role: "user",
        content: `Analyze these Trump/market headlines. Return ONLY valid JSON no markdown backticks:

Headlines:
${headlines}

Required format:
{"whyScore":"why impact is ${avgImpact}/10 in 2 sentences","marketEffect":"Gold and USD effect in 2 sentences","watchFor":"what to watch next in 1 sentence","speechSummary":${hasSpeech ? '"speech summary and market reaction"' : 'null'}}`
      }]
    })
  });

  const data = await res.json();
  const text = (data.content?.[0]?.text ?? "{}").replace(/```json|```/g, "").trim();
  
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ whyScore: null, marketEffect: null, watchFor: null, speechSummary: null });
  }
}
