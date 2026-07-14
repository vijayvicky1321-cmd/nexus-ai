"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiFetch } from "@/lib/api-client";

type OrgMember = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: string;
  image_url: string | null;
};

function roleLabel(role: string) {
  return role.replace(/^org:/, "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkspacesPage() {
  const { getToken } = useAuth();
  const { organization, isLoaded } = useOrganization();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await apiFetch("/org/members", token);
      if (!res.ok) return;
      setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [getToken, organization]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  if (!isLoaded) return null;

  if (!organization) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10">
          <Users className="size-5 text-indigo-500" />
        </div>
        <h1 className="text-xl font-semibold">Team Workspaces</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Select or create an organization from the sidebar to use Team Workspaces.
        </p>
        <div className="mt-2">
          <OrganizationSwitcher hidePersonal={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={organization.imageUrl} alt={organization.name} />
          <AvatarFallback>{organization.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">{organization.name}</h1>
          <p className="text-sm text-muted-foreground">
            {organization.membersCount} member{organization.membersCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
        Conversations and documents created while this organization is active are shared
        with all members.
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground">
            People with access to this organization&apos;s workspace.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {loading && members.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">Loading members...</p>
          )}
          {!loading && members.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No members found.</p>
          )}
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.image_url ?? undefined} alt={member.name ?? member.email ?? ""} />
                  <AvatarFallback>
                    {(member.name ?? member.email ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.name || member.email}</p>
                  {member.name && (
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  )}
                </div>
              </div>
              <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-xs text-muted-foreground">
                {roleLabel(member.role)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
