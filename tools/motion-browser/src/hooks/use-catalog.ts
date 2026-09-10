import { useQuery } from "@tanstack/react-query";

import {
  getAvatars,
  getScenes,
  getVoices,
  type ApiError,
  type CatalogItem,
} from "@/lib/api";
import type { PresetAvatar } from "@/components/custom/preset-avatar-select";

/** Thumbnail key used for the preset avatar carousel. */
const AVATAR_THUMBNAIL_KEY = "head";

function toPresetAvatar(item: CatalogItem): PresetAvatar {
  return {
    id: item.id,
    name: item.name,
    src: item.thumbnail_urls?.[AVATAR_THUMBNAIL_KEY] ?? "",
  };
}

/**
 * Loads the Connect catalog (avatars, scenes, voices) via React Query.
 *
 * Each resource is an independent query so it caches/retries on its own, while
 * this facade exposes a single combined view for the UI.
 */
export function useCatalog() {
  const avatarsQuery = useQuery({
    queryKey: ["catalog", "avatars"],
    queryFn: getAvatars,
    select: (data) => data.items.map(toPresetAvatar),
  });

  const scenesQuery = useQuery({
    queryKey: ["catalog", "scenes"],
    queryFn: getScenes,
    select: (data) => data.items,
  });

  const voicesQuery = useQuery({
    queryKey: ["catalog", "voices"],
    queryFn: getVoices,
    select: (data) => data.items,
  });

  return {
    avatars: avatarsQuery.data ?? [],
    scenes: scenesQuery.data ?? [],
    voices: voicesQuery.data ?? [],
    isLoading:
      avatarsQuery.isLoading || scenesQuery.isLoading || voicesQuery.isLoading,
    error: (avatarsQuery.error ??
      scenesQuery.error ??
      voicesQuery.error ??
      null) as ApiError | null,
  };
}
