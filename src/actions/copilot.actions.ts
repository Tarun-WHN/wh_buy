"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const tools: Anthropic.Tool[] = [
  {
    name: "search_products",
    description: "Search products / SKUs by name or SKU. Returns product details (brand, model, size, category).",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "find_suppliers",
    description:
      "For a product (name or SKU), list vendors who can supply it with their rate, city, lead time, rating and preferred status. Use for 'cheapest supplier', 'vendor comparison for X', 'shortest lead time'.",
    input_schema: { type: "object", properties: { productQuery: { type: "string" } }, required: ["productQuery"] },
  },
  {
    name: "list_vendors",
    description:
      "List vendors, optionally filtered by city or search text. Each vendor includes city, state, GST status, payment terms, product count, purchase-order count and last order date. Use for 'vendors in South India', 'best payment terms', 'vendors with no orders in N months'.",
    input_schema: { type: "object", properties: { city: { type: "string" }, search: { type: "string" } } },
  },
  {
    name: "product_pricing",
    description: "Price benchmark (lowest / average / highest) for a product from historical data.",
    input_schema: { type: "object", properties: { productQuery: { type: "string" } }, required: ["productQuery"] },
  },
  {
    name: "spend_overview",
    description: "Overall spend summary: total spend, PO count, and top vendors by spend.",
    input_schema: { type: "object", properties: {} },
  },
];

async function execTool(name: string, input: Record<string, unknown>) {
  const str = (v: unknown) => (v == null ? "" : String(v));
  if (name === "search_products") {
    const q = str(input.query);
    const products = await prisma.product.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
      take: 20,
      select: {
        name: true, sku: true, brand: true, modelNumber: true, size: true, uom: true,
        productGroup: { select: { subcategory: { select: { category: { select: { name: true } } } } } },
      },
    });
    return products.map((p) => ({
      name: p.name, sku: p.sku, brand: p.brand, model: p.modelNumber, size: p.size, uom: p.uom,
      category: p.productGroup?.subcategory?.category?.name ?? null,
    }));
  }
  if (name === "find_suppliers") {
    const q = str(input.productQuery);
    const products = await prisma.product.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
      take: 5, select: { id: true, name: true, sku: true },
    });
    const out = [];
    for (const p of products) {
      const vps = await prisma.vendorProduct.findMany({
        where: { productId: p.id },
        select: {
          rate: true, leadTimeDays: true,
          vendor: { select: { name: true, city: true, rating: true, preferenceStatus: true, gstNumber: true } },
        },
      });
      const suppliers = vps
        .map((v) => ({
          vendor: v.vendor.name, city: v.vendor.city, rate: v.rate, leadTimeDays: v.leadTimeDays,
          rating: v.vendor.rating, preferred: v.vendor.preferenceStatus === "PREFERRED", gst: !!v.vendor.gstNumber,
        }))
        .sort((a, b) => (a.rate ?? 1e12) - (b.rate ?? 1e12));
      out.push({ product: p.name, sku: p.sku, suppliers });
    }
    return out;
  }
  if (name === "list_vendors") {
    const where: Record<string, unknown> = { deletedAt: null };
    if (input.city) where.city = { contains: str(input.city) };
    if (input.search) where.OR = [{ name: { contains: str(input.search) } }, { code: { contains: str(input.search) } }];
    const vendors = await prisma.vendor.findMany({
      where, take: 50,
      select: {
        name: true, code: true, city: true, state: true, gstNumber: true, paymentTerms: true, preferenceStatus: true,
        purchaseOrders: { where: { deletedAt: null }, select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { vendorProducts: true, purchaseOrders: true } },
      },
    });
    return vendors.map((v) => ({
      name: v.name, city: v.city, state: v.state, gst: !!v.gstNumber, paymentTerms: v.paymentTerms,
      status: v.preferenceStatus, products: v._count.vendorProducts, orders: v._count.purchaseOrders,
      lastOrder: v.purchaseOrders[0]?.createdAt ?? null,
    }));
  }
  if (name === "product_pricing") {
    const q = str(input.productQuery);
    const products = await prisma.product.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
      take: 5, select: { id: true, name: true, sku: true },
    });
    const out = [];
    for (const p of products) {
      const prices: number[] = [];
      const ph = await prisma.priceHistory.findMany({ where: { productId: p.id }, select: { unitPrice: true } });
      for (const x of ph) if (x.unitPrice > 0) prices.push(x.unitPrice);
      const poli = await prisma.poLineItem.findMany({ where: { productId: p.id }, select: { unitPrice: true } });
      for (const x of poli) if (x.unitPrice > 0) prices.push(x.unitPrice);
      if (prices.length === 0) { out.push({ product: p.name, sku: p.sku, note: "no pricing data yet" }); continue; }
      out.push({
        product: p.name, sku: p.sku,
        lowest: Math.min(...prices), average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        highest: Math.max(...prices), dataPoints: prices.length,
      });
    }
    return out;
  }
  if (name === "spend_overview") {
    const pos = await prisma.purchaseOrder.findMany({
      where: { deletedAt: null }, select: { totalAmount: true, vendor: { select: { name: true } } },
    });
    const byV = new Map<string, number>();
    for (const p of pos) byV.set(p.vendor.name, (byV.get(p.vendor.name) ?? 0) + p.totalAmount);
    return {
      totalSpend: pos.reduce((a, p) => a + p.totalAmount, 0),
      poCount: pos.length,
      topVendors: [...byV.entries()].map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend).slice(0, 5),
    };
  }
  return { error: "unknown tool" };
}

const SYSTEM = `You are the NOW-BUY Procurement Copilot for Warehouse Now, an Indian warehousing company.
Answer procurement questions using ONLY the provided tools to fetch real data — never invent vendors, products, rates or numbers.
Currency is INR; format amounts with ₹. Be concise and use short markdown tables or bullet points.
If the tools return no data, say so plainly and suggest what to add (e.g. record quotes, import bills).
When asked to recommend, briefly explain why (price, coverage, reliability).`;

export async function askCopilot(
  history: { role: "user" | "assistant"; content: string }[]
) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.ANALYTICS_VIEW))
    throw new Error("You do not have access to the Copilot");
  if (!process.env.ANTHROPIC_API_KEY)
    return { answer: "The AI Copilot isn't configured — ANTHROPIC_API_KEY is missing on the server." };

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let i = 0; i < 6; i++) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        tools,
        messages,
      });

      if (resp.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type === "tool_use") {
            let out: unknown;
            try {
              out = await execTool(block.name, block.input as Record<string, unknown>);
            } catch (e) {
              out = { error: e instanceof Error ? e.message : "tool failed" };
            }
            results.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(out).slice(0, 8000),
            });
          }
        }
        messages.push({ role: "user", content: results });
        continue;
      }

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { answer: text || "I couldn't produce an answer — please rephrase." };
    }
    return { answer: "That took too many steps — try a more specific question." };
  } catch (e) {
    return {
      answer: `Sorry, the Copilot hit an error: ${e instanceof Error ? e.message : "unknown"}.`,
    };
  }
}
