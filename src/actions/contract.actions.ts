"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { readFile } from "fs/promises";
import path from "path";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// CAPABILITY 14 — AI CONTRACT MANAGEMENT
// Reads an uploaded contract (PDF or image) and extracts key clauses.
export async function analyzeContract(filePath: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.VENDOR_MANAGE))
    throw new Error("You do not have permission to analyze contracts");
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("AI is not configured (ANTHROPIC_API_KEY missing).");

  // Resolve the stored file from the upload dir (served via /api/files/<name>).
  const name = path.basename(filePath);
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("Invalid file");
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const buf = await readFile(path.join(uploadDir, name));
  const b64 = buf.toString("base64");
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  const client = new Anthropic();
  const system = `You are a contracts analyst. Extract key commercial terms from the contract.
Respond with STRICT JSON only:
{ "title": string, "parties": string, "validity": string, "priceLock": string, "paymentTerms": string,
  "penalty": string, "warranty": string, "amc": string, "escalationClause": string, "renewalDate": string,
  "summary": string }.
Use "" for anything not present. renewalDate should be YYYY-MM-DD if a date is stated, else "".`;

  let filePart: Anthropic.ContentBlockParam;
  if (ext === "pdf") {
    filePart = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    };
  } else if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const mt =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    filePart = { type: "image", source: { type: "base64", media_type: mt, data: b64 } };
  } else {
    throw new Error("Upload a PDF or image of the contract");
  }

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [
      {
        role: "user",
        content: [filePart, { type: "text", text: "Extract the key terms as JSON." }],
      },
    ],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[{]/);
  return JSON.parse(start >= 0 ? cleaned.slice(start) : cleaned) as Record<string, string>;
}
