"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Shuffle,
  Copy,
  Check,
  X,
  Plus,
  Ticket,
  Percent,
  IndianRupee,
  Calendar,
  Users,
  Package,
  ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { InputGroup, InputPrefix, InputSuffix } from "@/components/ui/input-group";

interface PackOption {
  id: string;
  title: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discountType: "flat" | "percentage";
  discountValue: number;
  maxDiscountCap: number | undefined;
  minOrderAmount: number | undefined;
  applicablePacks: string[];
  restrictedToEmails: string[];
  startsAt: string;
  expiresAt: string;
  maxUses: number;
  maxUsesPerUser: number;
  isDraft: boolean;
  isActive: boolean;
}

interface Props {
  mode: "create" | "edit";
  initialData?: Partial<CouponFormData>;
  couponId?: string;
  packs: PackOption[];
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function toDatetimeLocal(d: string | Date): string {
  const dt = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const defaultData: CouponFormData = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  maxDiscountCap: undefined,
  minOrderAmount: undefined,
  applicablePacks: [],
  restrictedToEmails: [],
  startsAt: toDatetimeLocal(new Date()),
  expiresAt: toDatetimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  maxUses: 0,
  maxUsesPerUser: 1,
  isDraft: true,
  isActive: true,
};

export default function CouponEditorForm({
  mode,
  initialData,
  couponId,
  packs,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const merged: CouponFormData = {
    ...defaultData,
    ...initialData,
    startsAt: initialData?.startsAt
      ? toDatetimeLocal(initialData.startsAt)
      : defaultData.startsAt,
    expiresAt: initialData?.expiresAt
      ? toDatetimeLocal(initialData.expiresAt)
      : defaultData.expiresAt,
  };

  const [form, setForm] = useState<CouponFormData>(merged);

  const set = useCallback(
    <K extends keyof CouponFormData>(key: K, value: CouponFormData[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const handleGenerateCode = () => {
    set("code", generateCode());
  };

  const handleCopyCode = async () => {
    if (!form.code) return;
    await navigator.clipboard.writeText(form.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const togglePack = (id: string) => {
    set(
      "applicablePacks",
      form.applicablePacks.includes(id)
        ? form.applicablePacks.filter((p) => p !== id)
        : [...form.applicablePacks, id]
    );
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (form.restrictedToEmails.includes(email)) {
      toast.error("Email already added");
      return;
    }
    set("restrictedToEmails", [...form.restrictedToEmails, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    set(
      "restrictedToEmails",
      form.restrictedToEmails.filter((e) => e !== email)
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (mode === "create" && form.code.length < 3) {
      errs.code = "Code must be at least 3 characters";
    }
    if (form.discountValue <= 0) {
      errs.discountValue = "Discount must be positive";
    }
    if (form.discountType === "percentage" && form.discountValue > 100) {
      errs.discountValue = "Percentage discount cannot exceed 100%";
    }
    if (new Date(form.expiresAt) <= new Date(form.startsAt)) {
      errs.expiresAt = "Expiry date must be after start date";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
        maxDiscountCap: form.maxDiscountCap || undefined,
        minOrderAmount: form.minOrderAmount || undefined,
        isDraft: form.isDraft,
      };

      const url =
        mode === "create" ? "/api/coupons" : `/api/coupons/${couponId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${mode} coupon`);
      }

      toast.success(mode === "create" ? "Coupon created" : "Coupon updated");
      router.push("/studio/coupons");
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Failed to ${mode} coupon`;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="page-shell max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          {mode === "create" ? "Create Coupon" : "Edit Coupon"}
        </h1>
        <p className="text-muted-foreground">
          {mode === "create"
            ? "Set up a new discount code for your beat packs."
            : "Update this coupon's settings."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Code */}
        <FormSection title="Coupon Code" icon={<Ticket />}>
          <div className="space-y-4">
            <FormField label="Code" htmlFor="code" required>
              <div className="flex gap-2">
                <InputGroup className="flex-1">
                  <InputPrefix><Ticket /></InputPrefix>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER20"
                    className="font-mono uppercase tracking-wider"
                    maxLength={20}
                    disabled={mode === "edit"}
                    required
                  />
                </InputGroup>
                {mode === "create" && (
                  <Button type="button" variant="outline" size="icon" onClick={handleGenerateCode} aria-label="Generate random code" className="shrink-0">
                    <Shuffle className="h-4 w-4" />
                  </Button>
                )}
                {form.code && (
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copy code" className="shrink-0">
                    {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </FormField>

            <FormField
              label="Description"
              htmlFor="coupon-desc"
              optional
              description="Internal note — not visible to buyers"
            >
              <Input
                id="coupon-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Summer sale — 20% off all packs"
                maxLength={200}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Discount */}
        <FormSection
          title="Discount"
          icon={<Percent />}
          description="Configure the discount amount and any caps"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type" htmlFor="discount-type">
                <Select
                  value={form.discountType}
                  onValueChange={(v) => set("discountType", v as "flat" | "percentage")}
                >
                  <SelectTrigger id="discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Value" htmlFor="discount-value" required>
                <InputGroup>
                  <InputPrefix>
                    {form.discountType === "percentage" ? <Percent /> : <IndianRupee />}
                  </InputPrefix>
                  <Input
                    id="discount-value"
                    type="number"
                    min={1}
                    max={form.discountType === "percentage" ? 100 : undefined}
                    step="any"
                    value={form.discountValue}
                    onChange={(e) => {
                      set("discountValue", Number(e.target.value));
                      setErrors((prev) => ({ ...prev, discountValue: "" }));
                    }}
                    aria-invalid={!!errors.discountValue}
                    required
                  />
                </InputGroup>
                {errors.discountValue && (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {errors.discountValue}
                  </p>
                )}
              </FormField>
            </div>

            {form.discountType === "percentage" && (
              <FormField
                label="Max discount cap"
                htmlFor="max-cap"
                optional
                description="Maximum discount in rupees regardless of percentage"
              >
                <InputGroup>
                  <InputPrefix><IndianRupee /></InputPrefix>
                  <Input
                    id="max-cap"
                    type="number"
                    min={0}
                    value={form.maxDiscountCap ?? ""}
                    onChange={(e) =>
                      set("maxDiscountCap", e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="No cap"
                  />
                </InputGroup>
              </FormField>
            )}

            <FormField
              label="Minimum order amount"
              htmlFor="min-order"
              optional
              description="Coupon only applies if order total is at least this amount"
            >
              <InputGroup>
                <InputPrefix><IndianRupee /></InputPrefix>
                <Input
                  id="min-order"
                  type="number"
                  min={0}
                  value={form.minOrderAmount ?? ""}
                  onChange={(e) =>
                    set("minOrderAmount", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="No minimum"
                />
              </InputGroup>
            </FormField>
          </div>
        </FormSection>

        {/* Applicable Packs */}
        <FormSection
          title="Applicable Beat Packs"
          icon={<Package />}
          description="Leave empty to apply to all your packs"
        >
          {packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No beat packs found. Create a pack first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {packs.map((pack) => {
                const selected = form.applicablePacks.includes(pack.id);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={`Apply coupon to ${pack.title}`}
                    onClick={() => togglePack(pack.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {selected && <Check className="mr-1 -ml-0.5 inline-block h-3.5 w-3.5" />}
                    {pack.title}
                  </button>
                );
              })}
            </div>
          )}
        </FormSection>

        {/* Validity */}
        <FormSection
          title="Validity Period"
          icon={<Calendar />}
          description="When this coupon can be redeemed"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" htmlFor="start-date" required>
              <InputGroup>
                <InputPrefix><Calendar /></InputPrefix>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set("startsAt", e.target.value)}
                  required
                />
              </InputGroup>
            </FormField>

            <FormField label="Expiry Date" htmlFor="expiry-date" required>
              <InputGroup>
                <InputPrefix><Calendar /></InputPrefix>
                <Input
                  id="expiry-date"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => {
                    set("expiresAt", e.target.value);
                    setErrors((prev) => ({ ...prev, expiresAt: "" }));
                  }}
                  aria-invalid={!!errors.expiresAt}
                  required
                />
              </InputGroup>
              {errors.expiresAt && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {errors.expiresAt}
                </p>
              )}
            </FormField>
          </div>
        </FormSection>

        {/* Usage Limits */}
        <FormSection
          title="Usage Limits"
          icon={<Users />}
          description="Control how many times this coupon can be used"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Total uses"
              htmlFor="max-uses"
              description="0 = unlimited"
            >
              <Input
                id="max-uses"
                type="number"
                min={0}
                value={form.maxUses}
                onChange={(e) => set("maxUses", Number(e.target.value))}
              />
            </FormField>

            <FormField
              label="Per-user limit"
              htmlFor="max-per-user"
              description="0 = unlimited"
            >
              <Input
                id="max-per-user"
                type="number"
                min={0}
                value={form.maxUsesPerUser}
                onChange={(e) => set("maxUsesPerUser", Number(e.target.value))}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Audience Restrictions */}
        <FormSection
          title="Audience Restrictions"
          icon={<Users />}
          description="Restrict to specific customer emails — leave empty for public access"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <InputGroup className="flex-1">
                <InputPrefix><Users /></InputPrefix>
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="customer@example.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                />
              </InputGroup>
              <Button type="button" variant="outline" size="icon" onClick={addEmail} aria-label="Add email" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.restrictedToEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.restrictedToEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* Status Controls */}
        <FormSection title="Status" icon={<ToggleLeft />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 p-4">
              <div>
                <p className="text-sm font-medium">
                  {form.isDraft ? "Draft" : "Published"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.isDraft
                    ? "Coupon is not visible to buyers. Publish when ready."
                    : "Coupon is live and can be used by buyers."}
                </p>
              </div>
              <Switch
                checked={!form.isDraft}
                onCheckedChange={(v) => set("isDraft", !v)}
              />
            </div>
            {!form.isDraft && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 p-4">
                <div>
                  <p className="text-sm font-medium">
                    {form.isActive ? "Active" : "Paused"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {form.isActive
                      ? "Coupon is accepting redemptions."
                      : "Coupon is paused. It can be resumed later."}
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => set("isActive", v)}
                />
              </div>
            )}
          </div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/studio/coupons")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode === "create"
              ? form.isDraft
                ? "Save as Draft"
                : "Create & Publish"
              : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
