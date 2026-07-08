"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2, FolderTree } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { standardizeSkus, suggestCategory } from "@/actions/ai-tools.actions";

export default function AiToolsPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="AI Product Tools"
        description="Standardize vendor product names and auto-classify SKUs into your taxonomy."
      />
      <SkuStandardizer />
      <CategorySuggester />
    </div>
  );
}

function SkuStandardizer() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<
    { canonicalName: string; suggestedSku: string; uom: string; keywords: string[]; aliases: string[] }[]
  >([]);

  async function run() {
    if (!text.trim()) return toast.error("Paste some product descriptions");
    setBusy(true);
    try {
      setGroups((await standardizeSkus(text)) as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="size-4 text-[#F47B20]" />
          SKU Standardization
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Paste raw vendor descriptions (one per line). The AI groups identical
          products under one standardized name with aliases.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Shrink Wrap\nStretch Film 500mm\nLLDPE Stretch Roll\nPallet Wrapping Film"}
        />
        <Button variant="brand" onClick={run} disabled={busy}>
          <Sparkles className="mr-1.5 size-4" />
          {busy ? "Analyzing…" : "Standardize"}
        </Button>

        {groups.length > 0 && (
          <div className="space-y-3 pt-2">
            {groups.map((g, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{g.canonicalName}</span>
                  <Badge variant="secondary">{g.suggestedSku}</Badge>
                  <span className="text-xs text-muted-foreground">{g.uom}</span>
                </div>
                {g.aliases?.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aliases: {g.aliases.join(" · ")}
                  </p>
                )}
                {g.keywords?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {g.keywords.map((k) => (
                      <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategorySuggester() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { category: string; subcategory: string; group: string; isNew: boolean } | null
  >(null);

  async function run() {
    if (!name.trim()) return toast.error("Enter a product name");
    setBusy(true);
    try {
      setResult((await suggestCategory(name)) as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderTree className="size-4 text-[#F47B20]" />
          AI Category Suggestion
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter a product and get the best Category → Sub-category → Group from your
          taxonomy (or a suggested new one).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Industrial Exhaust Fan 24 inch"
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <Button variant="brand" onClick={run} disabled={busy}>
            <Sparkles className="mr-1.5 size-4" />
            {busy ? "…" : "Suggest"}
          </Button>
        </div>
        {result && (
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{result.category}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">{result.subcategory}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">{result.group}</Badge>
              {result.isNew && (
                <Badge className="bg-[#F47B20] text-white">new</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {result.isNew
                ? "Suggested new taxonomy — create it in Categories, then use it on the product."
                : "Matches your existing taxonomy — select it on the product form."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
