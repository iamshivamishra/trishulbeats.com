import { userRepository } from "@/lib/repositories/user.repository";
import { toggleUserVerifiedAction } from "./actions";
import RoleSelect from "./RoleSelect";

export default async function AdminUsersPage() {
  const users = await userRepository.findAllPaginated({ page: 1, limit: 50 });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-[#141414] text-left text-zinc-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Verified</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u._id.toString()} className="border-t border-border/30">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-zinc-400">{u.email}</td>
                <td className="p-3">
                  <RoleSelect userId={u._id.toString()} currentRole={u.role} />
                </td>
                <td className="p-3">
                  <form action={toggleUserVerifiedAction}>
                    <input type="hidden" name="userId" value={u._id.toString()} />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.verified ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {u.verified ? "Verified" : "Unverified"}
                    </button>
                  </form>
                </td>
                <td className="p-3 text-zinc-400">
                  {new Date(u.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}