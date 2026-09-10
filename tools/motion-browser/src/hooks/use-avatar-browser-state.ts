import { useEffect, useRef, useState } from "react";

import type { PresetAvatar } from "@/components/custom/preset-avatar-select";
import type {
  ScriptComposerHandle,
  ScriptSegment,
} from "@/components/custom/script-composer";
import type { CatalogItem } from "@/lib/api";
import { useMotions } from "@/hooks/use-motions";

export interface AvatarBrowserSelection {
  avatar: string;
  scene: string;
  voice: string;
}

interface UseAvatarBrowserStateOptions {
  avatars: PresetAvatar[];
  scenes: CatalogItem[];
  voices: CatalogItem[];
}

export function useAvatarBrowserState({
  avatars,
  scenes,
  voices,
}: UseAvatarBrowserStateOptions) {
  const [selection, setSelection] = useState<AvatarBrowserSelection>({
    avatar: "",
    scene: "",
    voice: "",
  });
  const [selectedMotionId, setSelectedMotionId] = useState("");
  const composerRef = useRef<ScriptComposerHandle>(null);

  const resolvedSelection = {
    avatar: selection.avatar || avatars[0]?.id || "",
    scene: selection.scene || scenes[0]?.id || "",
    voice: selection.voice || voices[0]?.id || "",
  };
  const {
    motions,
    isLoading: motionsLoading,
    error: motionsError,
  } = useMotions(resolvedSelection.avatar);

  const previousAvatarRef = useRef("");
  useEffect(() => {
    if (!resolvedSelection.avatar || motionsLoading) return;
    if (resolvedSelection.avatar === previousAvatarRef.current) return;

    previousAvatarRef.current = resolvedSelection.avatar;
    const greeting = motions.find((motion) => motion.category === "greeting");
    const segments: ScriptSegment[] = [];
    if (greeting) {
      segments.push({ type: "chip", id: greeting.id, label: greeting.name });
    }
    segments.push({ type: "text", value: "Hello, welcome to perxona!" });
    composerRef.current?.replaceSegments(segments);
  }, [motions, motionsLoading, resolvedSelection.avatar]);

  const handleMotionChange = (id: string) => {
    setSelectedMotionId(id);
    const picked = motions.find((motion) => motion.id === id);
    if (picked) composerRef.current?.insertChip(picked.id, picked.name);
  };

  return {
    composerRef,
    motions,
    motionsError,
    motionsLoading,
    resolvedSelection,
    selectedMotionId,
    setSelection,
    handleMotionChange,
  };
}
