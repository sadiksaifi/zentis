import { Header } from "@/components/header";
import { CommandMenu } from "@/components/command-menu";
import {
  Outlet,
  createFileRoute,
  redirect,
  useMatchRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const { data: session } = await context.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const matchRoute = useMatchRoute();
  const isBoardRoute = matchRoute({ to: "/board/$boardId", fuzzy: true });

  return (
    <>
      {!isBoardRoute && <Header />}
      <Outlet />
      <CommandMenu />
    </>
  );
}
