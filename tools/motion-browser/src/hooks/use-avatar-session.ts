import type React from "react";
import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { getConnectPublishableKey } from "@/lib/env";
import { usePresenter } from "./use-presenter";

export interface LaunchParams {
  avatarId: string;
  sceneId: string;
  voiceId: string;
}

/**
 * Bridges the Connect API with the imperative presenter.
 *
 *  - `launch` initializes the presenter with the build-time publishable key
 *    and the chosen avatar/scene/voice (React Query mutation drives
 *    `isLaunching`) — the key is used as-is, no exchange step.
 *  - `speak` calls `presenter.present(text)` directly — the presenter builds
 *    the performance internally via the Connect API.
 *  - A key has no rotation, so there's nothing to refresh: on
 *    `CONNECT_KEY_REJECTED` the presenter's own `keyRejected` state flips,
 *    which the UI renders as an error screen — see `use-presenter.ts`.
 */
export function useAvatarSession(
  stageRef: React.RefObject<HTMLDivElement | null>,
) {
  const presenter = usePresenter({ stageRef });

  const launchMutation = useMutation({
    mutationFn: async ({ avatarId, sceneId, voiceId }: LaunchParams) => {
      await presenter.initializeWithConnectKey(getConnectPublishableKey(), {
        avatarId,
        sceneId,
        voiceId,
      });
    },
  });

  const speakMutation = useMutation({
    mutationFn: async (text: string) => {
      const message = text.trim();
      if (!message || !presenter.ready) return;
      // Resume AudioContext from this user-gesture click before synthesizing speech.
      await presenter.resumeAudio();
      const result = await presenter.present(message);
      if (result && !result.success) {
        throw new Error(
          `Playback failed (${result.code}): ${result.message ?? ""}`,
        );
      }
    },
  });

  const launch = useCallback(
    (params: LaunchParams) => launchMutation.mutateAsync(params),
    [launchMutation],
  );

  const speak = useCallback(
    (text: string) => speakMutation.mutate(text),
    [speakMutation],
  );

  const interrupt = useCallback(() => {
    presenter.interruptPresentation();
  }, [presenter]);

  const playMotion = useCallback(
    (motionId: string) => presenter.playMotion(motionId),
    [presenter],
  );

  return {
    engineReady: presenter.mounted,
    ready: presenter.ready,
    loadError: presenter.loadError,
    retryLoad: presenter.retry,
    keyRejected: presenter.keyRejected,
    launch,
    isLaunching: launchMutation.isPending,
    launchError: launchMutation.error as Error | null,
    speak,
    isSpeaking: speakMutation.isPending,
    speakError: speakMutation.error as Error | null,
    interrupt,
    playMotion,
  };
}
