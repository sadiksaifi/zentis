import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { data: session, isPending } = authClient.useSession();

  if (!isPending && !session) {
    return null;
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <span className="text-sm font-semibold">zentis</span>
      <div className="flex items-center gap-2">
        {isPending ? (
          <Skeleton className="size-8 rounded-full" />
        ) : session?.user ? (
          <UserMenu user={session.user} />
        ) : null}
        <ModeToggle />
      </div>
    </header>
  );
}
