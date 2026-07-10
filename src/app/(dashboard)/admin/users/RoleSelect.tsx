"use client";

import { updateUserRoleAction } from "./actions";

export default function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  return (
    <form action={updateUserRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="rounded-md border border-border/50 bg-transparent px-2 py-1 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="buyer">buyer</option>
        <option value="producer">producer</option>
        <option value="admin">admin</option>
      </select>
    </form>
  );
}