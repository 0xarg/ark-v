import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "",
    "X-OpenRouter-Title": "Arkhv",
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { description?: unknown };
    const description = body.description;

    if (typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 },
      );
    }

    if (description.trim().length < 5) {
      return NextResponse.json(
        { error: "Description is too short to enhance." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional technical writer helping clients submit clear design and development requests.

TASK: Rewrite the user's description to be concise, specific, and actionable.

STRICT OUTPUT RULES — violating any of these is a failure:
- Plain text only. Zero markdown. No asterisks, no bold (**word**), no italics (*word*), no underscores, no backticks, no hashes, no bullet points, no numbered lists, no dashes used as list markers.
- Write in flowing prose sentences. One or two short paragraphs at most.
- No preamble, no intro phrase like "Here is..." or "Sure!", no closing note.
- No surrounding quotes.
- Preserve the original intent exactly. Do not invent requirements.
- Maximum 900 characters.`,
        },
        {
          role: "user",
          content: description.trim(),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json(
        { error: "No response from AI. Please try again." },
        { status: 500 },
      );
    }

    // Strip any markdown that slipped through despite instructions
    const enhanced = raw
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // **bold**, *italic*, ***both***
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")    // __bold__, _italic_
      .replace(/`([^`]+)`/g, "$1")               // `code`
      .replace(/^#{1,6}\s+/gm, "")              // ## headings
      .replace(/^[-*+]\s+/gm, "")               // - bullet points
      .replace(/^\d+\.\s+/gm, "")               // 1. numbered lists
      .replace(/\n{3,}/g, "\n\n")               // collapse excess blank lines
      .trim();

    return NextResponse.json({ enhanced: enhanced.slice(0, 1000) });
  } catch (err) {
    console.error("[enhance-description] error:", err);
    return NextResponse.json(
      { error: "Failed to enhance description. Please try again." },
      { status: 500 },
    );
  }
}
