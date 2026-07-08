"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

async function requireProduct() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.PRODUCT_MANAGE))
    throw new Error("You do not have permission for this");
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  return JSON.parse(start >= 0 ? cleaned.slice(start) : cleaned) as T;
}

async function complete(system: string, user: string): Promise<string> {
  const client = new Anthropic();
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ============================================================
// CAPABILITY 8 — SKU STANDARDIZATION
// ============================================================

export async function standardizeSkus(rawText: string) {
  await requireProduct();
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("AI is not configured (ANTHROPIC_API_KEY missing).");
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 80);
  if (lines.length === 0) throw new Error("Paste some product descriptions first");

  const system = `You are a procurement data specialist. Vendors describe identical products with different names.
Group the given descriptions into standardized products. Respond with STRICT JSON only: an array of
{ "canonicalName": string, "suggestedSku": string (short uppercase code), "uom": string, "keywords": string[], "aliases": string[] }.
"aliases" must be the exact original descriptions that map to this product.`;

  const text = await complete(system, "Descriptions:\n" + lines.join("\n"));
  return parseJson<
    { canonicalName: string; suggestedSku: string; uom: string; keywords: string[]; aliases: string[] }[]
  >(text);
}

// ============================================================
// CAPABILITY 7 — AI CATEGORY MANAGER
// ============================================================

export async function suggestCategory(productName: string, description?: string) {
  await requireProduct();
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("AI is not configured (ANTHROPIC_API_KEY missing).");
  if (!productName.trim()) throw new Error("Enter a product name");

  const cats = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      subcategories: {
        where: { deletedAt: null },
        select: { name: true, productGroups: { where: { deletedAt: null }, select: { name: true } } },
      },
    },
  });
  const tree = cats
    .map(
      (c) =>
        `${c.name}: ${c.subcategories
          .map((s) => `${s.name} [${s.productGroups.map((g) => g.name).join(", ")}]`)
          .join("; ")}`
    )
    .join("\n");

  const system = `You classify warehouse procurement products into a 3-level taxonomy: Category > Sub-category > Product Group.
Prefer reusing an EXISTING node from the provided taxonomy; only propose a new name if nothing fits.
Respond with STRICT JSON only: { "category": string, "subcategory": string, "group": string, "isNew": boolean }.`;

  const user = `Existing taxonomy:\n${tree || "(none yet)"}\n\nProduct: ${productName}${
    description ? `\nDescription: ${description}` : ""
  }`;
  const text = await complete(system, user);
  return parseJson<{ category: string; subcategory: string; group: string; isNew: boolean }>(text);
}
