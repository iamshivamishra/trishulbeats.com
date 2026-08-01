import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order.repository";
import TransactionHistory, {
  type Transaction,
} from "../TransactionHistoryClient";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await orderRepository.findByBuyer(session.user.id);

  const transactions: Transaction[] = orders.map((o) => ({
    orderId: o._id.toString(),
    receipt: o.receipt,
    status: o.status as Transaction["status"],
    totalAmount: o.totalAmount,
    itemCount: o.items.length,
    items: o.items.map((item) => ({
      beatTitle: item.beatTitle,
      licenseType: item.licenseType,
      sourceType: item.sourceType || "beat",
      price: item.price,
    })),
    razorpayPaymentId: o.razorpayPaymentId || undefined,
    paidAt: o.paidAt ? new Date(o.paidAt).toISOString() : undefined,
    createdAt: new Date(o.createdAt).toISOString(),
  }));

  return (
    <div className="page-shell max-w-4xl">
      <TransactionHistory transactions={transactions} />
    </div>
  );
}
