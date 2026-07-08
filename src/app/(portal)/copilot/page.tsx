"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Send, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askCopilot } from "@/actions/copilot.actions";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who is my cheapest supplier for racks?",
  "Show vendors with no orders in the last 18 months",
  "Generate a vendor comparison for safety items",
  "Which vendors supply in Karnataka?",
  "What's my total spend and top vendors?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await askCopilot(next);
      setMessages([...next, { role: "assistant", content: res.answer }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-4">
      <PageHeader
        title="Procurement Copilot"
        description="Ask anything about your vendors, products, pricing and spend — in plain English."
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          {/* messages */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#F47B20]/15 text-[#F47B20]">
                  <Sparkles className="size-6" />
                </div>
                <p className="mt-3 text-sm font-medium">Ask the Procurement Copilot</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  It answers from your real vendor, product, pricing and spend data.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      m.role === "user"
                        ? "bg-[#1B2A4A] text-white"
                        : "bg-[#F47B20]/15 text-[#F47B20]"
                    )}
                  >
                    {m.role === "user" ? <User className="size-4" /> : <Sparkles className="size-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      m.role === "user"
                        ? "bg-[#1B2A4A] text-white"
                        : "border bg-muted/30"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F47B20]/15 text-[#F47B20]">
                  <Sparkles className="size-4 animate-pulse" />
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t pt-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about vendors, prices, spend…"
              disabled={busy}
            />
            <Button type="submit" variant="brand" disabled={busy || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
