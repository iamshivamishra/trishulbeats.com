"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Save, RotateCcw,
  FileAudio, FileArchive, Briefcase, Radio, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InputGroup, InputPrefix, InputSuffix } from "@/components/ui/input-group";
import type { ILicense } from "@/types";

interface Props {
  licenses: ILicense[];
  beatId: string;
}

interface LicenseFormState {
  id: string;
  type: string;
  name: string;
  price: string;
  streamLimit: string;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  terms: string;
  isActive: boolean;
  dirty: boolean;
}

function fromLicense(lic: ILicense): LicenseFormState {
  return {
    id: lic._id.toString(),
    type: lic.type,
    name: lic.name || `${lic.type.charAt(0).toUpperCase() + lic.type.slice(1)} License`,
    price: lic.price.toString(),
    streamLimit: lic.streamLimit.toString(),
    includesWav: lic.includesWav,
    includesStems: lic.includesStems,
    commercialUse: lic.commercialUse,
    terms: lic.terms,
    isActive: lic.isActive,
    dirty: false,
  };
}

function tierBadgeColor(type: string) {
  switch (type) {
    case "basic": return "bg-primary/20 text-primary";
    case "premium": return "bg-amber-500/20 text-amber-400";
    case "unlimited": return "bg-violet-500/20 text-violet-400";
    default: return "";
  }
}

function tierIcon(type: string) {
  switch (type) {
    case "basic": return "bg-primary/10 border-primary/20";
    case "premium": return "bg-amber-500/10 border-amber-500/20";
    case "unlimited": return "bg-violet-500/10 border-violet-500/20";
    default: return "bg-muted/30 border-border/50";
  }
}

export default function LicenseEditor({ licenses, beatId }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState<LicenseFormState[]>(licenses.map(fromLicense));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const updateField = (id: string, field: keyof LicenseFormState, value: unknown) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, [field]: value, dirty: true } : f
      )
    );
  };

  const handleSave = async (form: LicenseFormState) => {
    setSavingId(form.id);
    try {
      const res = await fetch(`/api/licenses/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          price: Number(form.price),
          streamLimit: Number(form.streamLimit),
          includesWav: form.includesWav,
          includesStems: form.includesStems,
          commercialUse: form.commercialUse,
          terms: form.terms,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save license");
        return;
      }

      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, dirty: false } : f))
      );
      toast.success(`${form.name} saved`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all licenses to default pricing and terms? Your custom values will be lost.")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`/api/beats/${beatId}/licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetDefaults: true }),
      });

      if (!res.ok) {
        toast.error("Failed to reset licenses");
        return;
      }

      toast.success("Licenses reset to defaults");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Licenses</CardTitle>
            <CardDescription>
              Configure pricing and terms for each license tier
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-4 w-4" />
            )}
            Reset Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {forms.map((form) => (
          <div
            key={form.id}
            className={`space-y-4 rounded-xl border p-4 transition-colors ${tierIcon(form.type)}`}
          >
            {/* Tier header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={tierBadgeColor(form.type)}>{form.type}</Badge>
                {!form.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
                {form.dirty && (
                  <Badge variant="secondary" className="text-xs">
                    Unsaved
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active</span>
                <Switch
                  id={`active-${form.id}`}
                  checked={form.isActive}
                  onCheckedChange={(v) => updateField(form.id, "isActive", v)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="License Name" htmlFor={`name-${form.id}`}>
                <Input
                  id={`name-${form.id}`}
                  value={form.name}
                  onChange={(e) => updateField(form.id, "name", e.target.value)}
                  placeholder="License name"
                />
              </FormField>

              <FormField label="Price" htmlFor={`price-${form.id}`}>
                <InputGroup>
                  <InputPrefix><IndianRupee /></InputPrefix>
                  <Input
                    id={`price-${form.id}`}
                    type="number"
                    value={form.price}
                    onChange={(e) => updateField(form.id, "price", e.target.value)}
                    min={1}
                  />
                  <InputSuffix>
                    <span className="text-xs">INR</span>
                  </InputSuffix>
                </InputGroup>
              </FormField>
            </div>

            {/* Feature toggles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 p-3">
                <FileAudio className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-xs font-medium">WAV</p>
                <Switch
                  checked={form.includesWav}
                  onCheckedChange={(v) => updateField(form.id, "includesWav", v)}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 p-3">
                <FileArchive className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-xs font-medium">Stems</p>
                <Switch
                  checked={form.includesStems}
                  onCheckedChange={(v) => updateField(form.id, "includesStems", v)}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 p-3">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-xs font-medium">Commercial</p>
                <Switch
                  checked={form.commercialUse}
                  onCheckedChange={(v) => updateField(form.id, "commercialUse", v)}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 p-3">
                <Radio className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Streams</p>
                  <Input
                    type="number"
                    value={form.streamLimit}
                    onChange={(e) => updateField(form.id, "streamLimit", e.target.value)}
                    className="mt-1 h-7 text-xs"
                    min={-1}
                    placeholder="-1 = ∞"
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <FormField label="Terms" htmlFor={`terms-${form.id}`}>
              <Textarea
                id={`terms-${form.id}`}
                value={form.terms}
                onChange={(e) => updateField(form.id, "terms", e.target.value)}
                rows={2}
                className="text-xs"
                maxLength={1000}
              />
            </FormField>

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSave(form)}
                disabled={!form.dirty || savingId === form.id}
              >
                {savingId === form.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Save {form.name}
              </Button>
            </div>

            <Separator className="last:hidden" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
