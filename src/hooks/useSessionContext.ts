import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyContext } from "@/lib/session.functions";
import type { SessionContext } from "@/lib/nexus-shared";

export function useSessionContext() {
  const fetchContext = useServerFn(getMyContext);
  return useQuery<SessionContext>({
    queryKey: ["session-context"],
    queryFn: () => fetchContext(),
    retry: false,
    staleTime: 30_000,
  });
}
