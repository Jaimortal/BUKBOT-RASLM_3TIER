import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EMPTY_NORMALIZATION_RULES,
  fetchNormalizationRules,
  saveNormalizationRules,
  type NormalizationRules,
} from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RotateCcw, Save, Wand2 } from "lucide-react";

type RuleType = keyof NormalizationRules;

const RULE_TABS: Array<{ key: RuleType; label: string; help: string }> = [
  {
    key: "phrases",
    label: "Phrases",
    help: "Exact multi-word wording. Best for typos or fixed student phrases.",
  },
  {
    key: "tokens",
    label: "Tokens",
    help: "Single words only. Avoid generic words like id, course, office, pay, or student.",
  },
  {
    key: "roots",
    label: "Roots",
    help: "Word fragments for messy Bisaya forms, such as balhin or bayad.",
  },
  {
    key: "fuzzy_roots",
    label: "Fuzzy roots",
    help: "Important domain words with spelling tolerance. Use sparingly.",
  },
];

function rulesToText(rules: Record<string, string>) {
  return Object.entries(rules || {})
    .map(([key, value]) => `${key} => ${value}`)
    .join("\n");
}

function normalizeLinePart(value: string, maxLength: number) {
  return value
    .toLowerCase()
    .replace(/[^\w\s?'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function textToRules(text: string) {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.includes("=>") ? line.split("=>") : line.split("=");
    if (parts.length < 2) continue;
    const key = normalizeLinePart(parts[0], 80);
    const value = normalizeLinePart(parts.slice(1).join("=>"), 160);
    if (key && value) out[key] = value;
  }
  return out;
}

function applyPreview(text: string, rules: NormalizationRules) {
  const normalized = normalizeLinePart(text, 240);
  const concepts: string[] = [];
  const add = (value: string) => {
    const clean = normalizeLinePart(value, 160);
    if (clean && !concepts.includes(clean)) concepts.push(clean);
  };

  for (const [phrase, concept] of Object.entries(rules.phrases || {})) {
    if (new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(normalized)) {
      add(concept);
    }
  }

  const tokens = normalized.match(/\b[\w'-]+\b/g) || [];
  for (const token of tokens) {
    if (rules.tokens[token]) add(rules.tokens[token]);
    for (const [root, concept] of Object.entries(rules.roots || {})) {
      if (token.includes(root)) add(concept);
    }
    for (const [root, concept] of Object.entries(rules.fuzzy_roots || {})) {
      if (Math.abs(token.length - root.length) <= 3 && token.slice(0, 4) === root.slice(0, 4)) {
        add(concept);
      }
    }
  }

  return concepts.length ? `${normalized} ${concepts.join(" ")}` : normalized;
}

export function AdminNormalizationRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeRuleType, setActiveRuleType] = useState<RuleType>("phrases");
  const [draftText, setDraftText] = useState<Record<RuleType, string>>({
    phrases: "",
    tokens: "",
    roots: "",
    fuzzy_roots: "",
  });
  const [sample, setSample] = useState("mamalhinay ko sa buksu unsa requirements");

  const { data: rules = EMPTY_NORMALIZATION_RULES, isLoading } = useQuery({
    queryKey: ["normalizationRules"],
    queryFn: fetchNormalizationRules,
  });

  useEffect(() => {
    setDraftText({
      phrases: rulesToText(rules.phrases),
      tokens: rulesToText(rules.tokens),
      roots: rulesToText(rules.roots),
      fuzzy_roots: rulesToText(rules.fuzzy_roots),
    });
  }, [rules]);

  const draftRules = useMemo<NormalizationRules>(() => ({
    phrases: textToRules(draftText.phrases),
    tokens: textToRules(draftText.tokens),
    roots: textToRules(draftText.roots),
    fuzzy_roots: textToRules(draftText.fuzzy_roots),
  }), [draftText]);

  const saveMutation = useMutation({
    mutationFn: saveNormalizationRules,
    onSuccess: (result) => {
      if (!result.success) {
        toast({ title: "Rules were not saved", description: result.message, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["normalizationRules"] });
      toast({
        title: "Normalization rules saved",
        description: result.message || "Restart the Rasa action server to apply the changes.",
      });
    },
    onError: () => {
      toast({ title: "Failed to save rules", variant: "destructive" });
    },
  });

  const currentTab = RULE_TABS.find((tab) => tab.key === activeRuleType) || RULE_TABS[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Wand2 className="h-5 w-5 text-blue-700" />
          Query Normalization Rules
        </CardTitle>
        <CardDescription>
          Add safe typo and Bisaya mappings without editing Python. Use one rule per line: user wording =&gt; normalized concepts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Wrong rules can affect routing. Avoid generic single words such as id, course, office, pay, student, where, or what.
              Saved changes need a Rasa action server restart before live chat uses them.
            </p>
          </div>
        </div>

        <Tabs value={activeRuleType} onValueChange={(value) => setActiveRuleType(value as RuleType)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4">
            {RULE_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          {RULE_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="space-y-2">
              <Label>{tab.label} rules</Label>
              <p className="text-xs text-muted-foreground">{tab.help}</p>
              <Textarea
                value={draftText[tab.key]}
                onChange={(event) => setDraftText({ ...draftText, [tab.key]: event.target.value })}
                placeholder={"example typo => normalized concepts\nbalhinay => transferee transfer student"}
                className="min-h-40 font-mono text-xs"
                disabled={isLoading || saveMutation.isPending}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="rounded-lg border bg-slate-50 p-3">
          <Label>Test a sample query before saving</Label>
          <Input
            value={sample}
            onChange={(event) => setSample(event.target.value)}
            className="mt-2"
            placeholder="Type a sample student question"
          />
          <p className="mt-2 rounded-md bg-white p-2 font-mono text-xs text-slate-700 shadow-sm">
            {applyPreview(sample, draftRules)}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setDraftText({
              phrases: rulesToText(rules.phrases),
              tokens: rulesToText(rules.tokens),
              roots: rulesToText(rules.roots),
              fuzzy_roots: rulesToText(rules.fuzzy_roots),
            })}
            disabled={isLoading || saveMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={() => saveMutation.mutate(draftRules)}
            disabled={isLoading || saveMutation.isPending}
            className="text-white"
            style={{ background: "linear-gradient(to right, #001C38, #0356a9ff)" }}
          >
            <Save className="mr-2 h-4 w-4" />
            Save {currentTab.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
