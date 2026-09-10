import { useRef } from "react";

import { AppHeader } from "@/components/custom/app-header";
import { ActionPickerPanel } from "@/components/custom/action-picker-panel";
import { PresenterControlBar } from "@/components/custom/presenter-control-bar";
import { PresenterStage } from "@/components/custom/presenter-stage";
import { useAvatarSession } from "@/hooks/use-avatar-session";
import { useAppErrorToasts } from "@/hooks/use-app-error-toasts";
import { useAvatarBrowserState } from "@/hooks/use-avatar-browser-state";
import { useCatalog } from "@/hooks/use-catalog";
import { usePresenterLaunch } from "@/hooks/use-presenter-launch";
import { isAuthError } from "@/lib/api";

function App() {
  const { avatars, voices, scenes, error: catalogError } = useCatalog();
  const stageRef = useRef<HTMLDivElement>(null);
  const session = useAvatarSession(stageRef);

  const {
    composerRef,
    motions,
    motionsError,
    resolvedSelection,
    selectedMotionId,
    setSelection,
    handleMotionChange,
  } = useAvatarBrowserState({ avatars, scenes, voices });

  // The presenter never gets a resolved avatar to initialize with when the
  // catalog itself is refused (usePresenterLaunch bails with no avatarId), so
  // a bad key from the very start never reaches CONNECT_KEY_REJECTED via the
  // presenter alone — surface the same screen from any REST call's 401/403.
  const catalogAuthError = isAuthError(catalogError);
  const motionsAuthError = isAuthError(motionsError);
  const keyRejected =
    session.keyRejected || catalogAuthError || motionsAuthError;

  useAppErrorToasts({
    // The keyRejected screen already explains an auth failure — showing the
    // generic "failed to load" toast on top of it is redundant and, worse,
    // implies a different, still-possibly-fixable problem.
    catalogError: catalogAuthError ? null : catalogError,
    loadError: session.loadError,
    launchError: session.launchError,
    speakError: session.speakError,
    motionsError: motionsAuthError ? null : motionsError,
  });

  usePresenterLaunch({
    engineReady: session.engineReady,
    launch: session.launch,
    avatarId: resolvedSelection.avatar,
    sceneId: resolvedSelection.scene,
    voiceId: resolvedSelection.voice,
  });

  return (
    /* Full-page stack: presenter is the background, all UI overlaid on top */
    <div className="relative min-h-svh overflow-hidden bg-grey-900">
      <PresenterStage
        stageRef={stageRef}
        loadError={session.loadError}
        onRetryLoad={session.retryLoad}
        keyRejected={keyRejected}
        // True from the moment a launch is requested (isLaunching) through to
        // PRESENTER_STATUS next reporting "Ready" (engineReady && !ready) —
        // isLaunching covers the gap before the widget itself reports
        // "Initializing" (resolveTarget()'s network round trip runs first),
        // and !ready covers the rest. Together this spans both the very
        // first launch and every later avatar/scene/voice switch, since all
        // of them re-run the same initialize sequence (see
        // use-presenter-launch.ts).
        initializing={
          session.isLaunching || (session.engineReady && !session.ready)
        }
        // PresenterStage suppresses the overlay above once this is set —
        // engineReady && !ready has no other way back to false when
        // initializeWithConnectKey() itself rejects (PRESENTER_STATUS never
        // reports "Ready" to clear it), so without this the overlay would
        // stay up forever instead of handing off to the toast below.
        launchError={session.launchError}
      />

      {/* Header — overlaid at top, semi-transparent */}
      <AppHeader className="absolute inset-x-0 top-0 z-20" />

      <ActionPickerPanel
        composerRef={composerRef}
        motions={motions}
        selectedMotionId={selectedMotionId}
        isSpeaking={session.isSpeaking}
        onSend={(text) => void session.speak(text)}
        onMotionChange={handleMotionChange}
        onMotionClick={session.playMotion}
      />

      <PresenterControlBar
        avatars={avatars}
        scenes={scenes}
        voices={voices}
        selection={resolvedSelection}
        onAvatarChange={(avatar) =>
          setSelection((current) => ({ ...current, avatar }))
        }
        onSceneChange={(scene) =>
          setSelection((current) => ({ ...current, scene }))
        }
        onVoiceChange={(voice) =>
          setSelection((current) => ({ ...current, voice }))
        }
      />
    </div>
  );
}

export default App;
