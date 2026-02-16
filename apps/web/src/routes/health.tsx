import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute('/health')({
  component: RouteComponent,
})

function RouteComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  return (
    <div className="border-b p-4">
      <h2 className="mb-2 font-medium">API Status</h2>
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-sm text-muted-foreground">
          {healthCheck.isLoading ? "Checking..." : healthCheck.data ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
