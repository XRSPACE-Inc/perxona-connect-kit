import type { RefObject } from "react";

import {
  MotionLibrary,
  type MotionItem,
} from "@/components/custom/motion-library";
import {
  ScriptComposer,
  type ScriptComposerHandle,
} from "@/components/custom/script-composer";

interface ActionPickerPanelProps {
  composerRef: RefObject<ScriptComposerHandle | null>;
  motions: MotionItem[];
  selectedMotionId: string;
  isSpeaking: boolean;
  onSend: (text: string) => void;
  onMotionChange: (id: string) => void;
  onMotionClick: (id: string) => void;
}

export function ActionPickerPanel({
  composerRef,
  motions,
  selectedMotionId,
  isSpeaking,
  onSend,
  onMotionChange,
  onMotionClick,
}: ActionPickerPanelProps) {
  return (
    <aside className="absolute bottom-4 right-4 top-[106px] z-10 flex w-[522px] flex-col gap-5 overflow-y-auto rounded-[20px] border border-1 border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.72)] p-5">
      <ScriptComposer ref={composerRef} defaultSegments={[]} onSend={onSend} />
      <MotionLibrary
        items={motions}
        value={selectedMotionId}
        onValueChange={onMotionChange}
        onMotionClick={onMotionClick}
        disabled={isSpeaking}
      />
    </aside>
  );
}
