"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export interface TransactionItem {
  beatTitle: string;
  licenseType: string;
  sourceType: string;
  price: number;
}

export interface Transaction {
  orderId: string;
  receipt: string;
  status: "pending" | "paid" | "failed" | "refunded";
  totalAmount: number;
  itemCount: number;
  items: TransactionItem[];
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

interface Props {
  transactions: Transaction[];
}

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
};

function TransactionRow({ txn }: { txn: Transaction }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const statusInfo = STATUS_STYLES[txn.status] ?? STATUS_STYLES.pending;
  const dateStr = new Date(txn.paidAt || txn.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function handleDownloadReceipt() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/orders/${txn.orderId}/receipt`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate receipt");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${txn.receipt}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/30 bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {txn.itemCount === 1
                  ? txn.items[0]?.beatTitle ?? "Order"
                  : `${txn.itemCount} items`}
              </p>
              <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0 shrink-0">
                {statusInfo.label}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">{txn.receipt}</span>
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateStr}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-sm font-bold">₹{txn.totalAmount.toLocaleString("en-IN")}</p>
          <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-background/50 px-3 py-3 space-y-3">
          {/* Meta info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Date: </span>
              {dateStr}
            </div>
            {txn.razorpayPaymentId && (
              <div>
                <span className="font-semibold text-foreground">Payment ID: </span>
                <span className="font-mono">{txn.razorpayPaymentId}</span>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="rounded-md border border-border/40 overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_60px_70px] gap-1 bg-muted/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Item</span>
              <span>License</span>
              <span>Type</span>
              <span className="text-right">Amount</span>
            </div>
            {txn.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_60px_70px] gap-1 px-3 py-2 text-xs border-t border-border/20"
              >
                <span className="truncate font-medium">{item.beatTitle}</span>
                <span className="capitalize">{item.licenseType}</span>
                <span className="capitalize">{item.sourceType}</span>
                <span className="text-right font-medium">
                  ₹{item.price.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_70px] gap-1 px-3 py-2 border-t border-border/40 bg-muted/20">
              <span className="text-xs font-bold">Total</span>
              <span className="text-xs font-bold text-right">
                ₹{txn.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Download receipt */}
          {txn.status === "paid" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDownloadReceipt}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download Receipt (PDF)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TransactionHistoryComponent({ transactions }: Props) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <TransactionRow key={txn.orderId} txn={txn} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <CreditCard className="mx-auto mb-2 h-8 w-8" />
            <p>No transactions yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
