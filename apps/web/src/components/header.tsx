import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/ui/kbd";
import { Search } from "lucide-react";

export function Header() {
  const { data: session, isPending } = authClient.useSession();

  if (!isPending && !session) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 absolute top-0 left-0 right-0 z-50">
      <span className="text-sm font-semibold">Zentis</span>
      <button
        onClick={() =>
          document.dispatchEvent(new CustomEvent("open-command-menu"))
        }
        className="hidden sm:inline-flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-3.5" />
        <span>Search boards...</span>
        <Kbd>⌘K</Kbd>
      </button>
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
