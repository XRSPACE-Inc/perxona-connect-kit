import { Volume2 } from "lucide-react";

import {
  PresetAvatarSelect,
  type PresetAvatar,
} from "@/components/custom/preset-avatar-select";
import { SceneSelect } from "@/components/custom/scene-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogItem } from "@/lib/api";
import type { AvatarBrowserSelection } from "@/hooks/use-avatar-browser-state";

interface PresenterControlBarProps {
  avatars: PresetAvatar[];
  scenes: CatalogItem[];
  voices: CatalogItem[];
  selection: AvatarBrowserSelection;
  onAvatarChange: (id: string) => void;
  onSceneChange: (id: string) => void;
  onVoiceChange: (id: string) => void;
}

export function PresenterControlBar({
  avatars,
  scenes,
  voices,
  selection,
  onAvatarChange,
  onSceneChange,
  onVoiceChange,
}: PresenterControlBarProps) {
  return (
    <div className="absolute bottom-8 left-0 right-[522px] z-10 flex justify-center">
      <div className="w-full max-w-[544px] rounded-[20px] border border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.12)] px-2.5 py-4 shadow-card backdrop-blur-md">
        <div className="flex flex-col gap-3">
          <PresetAvatarSelect
            avatars={avatars}
            value={selection.avatar}
            onValueChange={onAvatarChange}
          />

          <div className="flex items-center gap-4 px-2">
            <Select value={selection.voice} onValueChange={onVoiceChange}>
              <SelectTrigger className="h-11 flex-1 gap-2 rounded-2xl border-[rgba(145,158,171,0.2)] bg-[rgba(255,255,255,0.72)] px-3.5 text-[13px] font-medium text-foreground backdrop-blur-sm">
                <Volume2 className="size-5 shrink-0 text-grey-700" />
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-[52px] w-px bg-[rgba(255,255,255,0.4)]" />

            <SceneSelect
              scenes={scenes}
              value={selection.scene}
              onValueChange={onSceneChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
