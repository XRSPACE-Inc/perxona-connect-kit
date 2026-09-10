import type { ReactNode, RefObject } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PresenterStageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  loadError: Error | null;
  onRetryLoad: () => void;
  keyRejected: boolean;
  /**
   * True while the presenter is mid re-initialize (first launch, or any
   * later avatar/scene/voice switch) — the element itself is hidden for
   * this whole window (see use-presenter.ts), so this is what should cover
   * the gap with an intentional loading state instead of bare background.
   */
  initializing: boolean;
  /**
   * Set when the most recent launch (initializeWithConnectKey) rejected.
   * Suppresses the initializing overlay so it can't get stuck forever:
   * PRESENTER_STATUS never reports "Ready" again on its own after a
   * rejected launch, so nothing else would ever clear it. The failure
   * itself is already surfaced as a toast (see use-app-error-toasts.ts).
   */
  launchError: Error | null;
}

function StageOverlay({
  children,
  translucent = true,
}: {
  children: ReactNode;
  translucent?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 text-center text-white ${
        translucent ? "bg-grey-900/90" : "bg-grey-900"
      }`}
    >
      {children}
    </div>
  );
}

export function PresenterStage({
  stageRef,
  loadError,
  onRetryLoad,
  keyRejected,
  initializing,
  launchError,
}: PresenterStageProps) {
  // At most one overlay is ever shown, picked by priority — a state added
  // later just needs its own branch here rather than remembering to negate
  // itself out of every other branch's condition.
  const overlay = keyRejected
    ? "keyRejected"
    : loadError
      ? "loadError"
      : initializing && !launchError
        ? "initializing"
        : null;

  return (
    <>
      <div ref={stageRef} className="absolute inset-0 isolate" />

      {overlay === "loadError" && (
        <StageOverlay>
          <p className="max-w-md px-6 text-sm">Presenter failed to load.</p>
          <Button variant="secondary" onClick={onRetryLoad}>
            Retry
          </Button>
        </StageOverlay>
      )}

      {overlay === "initializing" && (
        <StageOverlay>
          <Loader2 className="size-10 animate-spin text-white" />
          <p className="text-sm text-white/70">Loading...</p>
        </StageOverlay>
      )}

      {overlay === "keyRejected" && (
        <StageOverlay translucent={false}>
          <p className="max-w-md px-6 text-sm">
            This API key is invalid or unauthorized. Check
            VITE_PERXONA_CONNECT_PUBLISHABLE_KEY and try again with a different
            key.
          </p>
        </StageOverlay>
      )}

      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[340px] -translate-x-1/2 rounded-full bg-[rgba(243,133,111,0.5)] blur-[120px]" />
    </>
  );
}
