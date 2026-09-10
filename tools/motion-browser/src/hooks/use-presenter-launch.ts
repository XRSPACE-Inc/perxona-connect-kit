import { useCallback, useEffect, useRef } from "react";

export interface PresenterLaunchParams {
  avatarId: string;
  sceneId: string;
  voiceId: string;
}

interface UsePresenterLaunchOptions extends PresenterLaunchParams {
  engineReady: boolean;
  launch: (params: PresenterLaunchParams) => Promise<unknown>;
}

function buildPresenterLaunchKey(
  avatarId: string,
  sceneId: string,
  voiceId: string,
): string {
  return `${avatarId}|${sceneId}|${voiceId}`;
}

/**
 * Consume the launch result so a failed launch cannot block later queued launches.
 * The original promise is still used below to update the session error state.
 */
function settleLaunchQueue(promise: Promise<unknown>): Promise<void> {
  return promise.then(
    () => undefined,
    () => undefined,
  );
}

/** Launches the presenter once per resolved avatar, scene, and voice tuple. */
export function usePresenterLaunch({
  engineReady,
  launch,
  avatarId,
  sceneId,
  voiceId,
}: UsePresenterLaunchOptions): void {
  const launchedKeyRef = useRef("");
  const launchGenerationRef = useRef(0);
  const launchQueueRef = useRef(Promise.resolve());
  const launchRef = useRef(launch);

  useEffect(() => {
    launchRef.current = launch;
  }, [launch]);

  const attemptLaunch = useCallback(() => {
    if (!engineReady || !avatarId || !sceneId || !voiceId) return;

    const key = buildPresenterLaunchKey(avatarId, sceneId, voiceId);
    if (launchedKeyRef.current === key) return;

    const generation = ++launchGenerationRef.current;
    const launchPromise = launchQueueRef.current
      .catch(() => undefined)
      .then(() => launchRef.current({ avatarId, sceneId, voiceId }));
    // Keep the queue usable after either a successful or failed launch.
    launchQueueRef.current = settleLaunchQueue(launchPromise);

    void launchPromise
      .then(() => {
        if (generation === launchGenerationRef.current) {
          launchedKeyRef.current = key;
        }
      })
      .catch(() => {
        // launch() already exposes this error through the presenter session state.
      });
  }, [avatarId, engineReady, sceneId, voiceId]);

  useEffect(() => {
    attemptLaunch();
  }, [attemptLaunch]);
}
