import { purchaseRepository } from "@/lib/repositories/purchase.repository";

export const dynamic = "force-dynamic";

type AdminSaleRow = {
  _id: string;
  buyerId: { name: string } | string | null;
  beatId: { title: string } | string | null;
  licenseType: string;
  amount: number;
  createdAt: string | Date;
};

export default async function AdminSalesPage() {
  const purchases = await purchaseRepository.findAllPaginated({ page: 1, limit: 50 });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Sales</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-[#141414] text-left text-zinc-400">
            <tr>
              <th className="p-3">Buyer</th>
              <th className="p-3">Beat</th>
              <th className="p-3">License</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(purchases as AdminSaleRow[]).map((p) => {
              const buyerName =
                typeof p.buyerId === "object" && p.buyerId !== null && "name" in p.buyerId
                  ? p.buyerId.name
                  : undefined;
              const beatTitle =
                typeof p.beatId === "object" && p.beatId !== null && "title" in p.beatId
                  ? p.beatId.title
                  : undefined;

              return (
                <tr key={p._id.toString()} className="border-t border-border/30">
                  <td className="p-3">{buyerName ?? "Unknown"}</td>
                  <td className="p-3 text-zinc-400">{beatTitle ?? "Deleted beat"}</td>
                  <td className="p-3 text-zinc-400 capitalize">{p.licenseType}</td>
                  <td className="p-3 text-red-500">₹{p.amount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}