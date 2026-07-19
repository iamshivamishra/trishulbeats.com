import Image from "next/image";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { deleteBeatAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminBeatRow = {
  _id: string;
  title: string;
  genre: string;
  coverUrl?: string;
  plays: number;
  status: string;
  isPublished: boolean;
  producerId: { name: string; username?: string } | string | null;
};

export default async function AdminBeatsPage() {
  const beats = await beatRepository.findAllPaginated({ page: 1, limit: 50 });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Beats</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-[#141414] text-left text-zinc-400">
            <tr>
              <th className="p-3">Cover</th>
              <th className="p-3">Title</th>
              <th className="p-3">Producer</th>
              <th className="p-3">Genre</th>
              <th className="p-3">Plays</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(beats as AdminBeatRow[]).map((b) => {
              const producerName =
                typeof b.producerId === "object" && b.producerId !== null && "name" in b.producerId
                  ? b.producerId.name
                  : undefined;

              return (
                <tr key={b._id.toString()} className="border-t border-border/30">
                  <td className="p-3">
                    {b.coverUrl && (
                      <Image src={b.coverUrl} alt={b.title} width={36} height={36} className="rounded object-cover" />
                    )}
                  </td>
                  <td className="p-3">{b.title}</td>
                  <td className="p-3 text-zinc-400">{producerName ?? "Unknown"}</td>
                  <td className="p-3 text-zinc-400">{b.genre}</td>
                  <td className="p-3 text-zinc-400">{b.plays}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        b.isPublished ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <form action={deleteBeatAction}>
                      <input type="hidden" name="beatId" value={b._id.toString()} />
                      <button type="submit" className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    </form>
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