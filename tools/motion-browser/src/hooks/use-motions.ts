import { useQuery } from "@tanstack/react-query";

import { getMotions, type ApiError } from "@/lib/api";
import type { MotionItem } from "@/components/custom/motion-library";

function extractCategory(tags: string[]): string {
  const tag = tags.find((t) => t.startsWith("category:"));
  return tag ? tag.slice("category:".length) : "Other";
}

/**
 * Fetches the motion catalog for the given avatar from the Connect API.
 * The query is disabled until `avatarId` is non-empty. Real Connect motions
 * have no thumbnail image (only 3D lod_urls), so `thumbnail` is left unset
 * and MotionLibrary renders a placeholder icon instead.
 */
export function useMotions(avatarId: string) {
  const query = useQuery({
    queryKey: ["motions", avatarId],
    queryFn: () => getMotions(avatarId),
    enabled: !!avatarId,
    select: (data): MotionItem[] =>
      data.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: extractCategory(item.tags),
        thumbnail: item.thumbnail,
        locked: false,
      })),
  });

  return {
    motions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
  };
}
