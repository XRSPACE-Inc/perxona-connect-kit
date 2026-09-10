import { useCallback, useEffect, useRef, useState } from "react";

import {
  loadPresenterEngine,
  type Presenter,
  type PresentationResult,
  type PresentationTarget,
} from "@/lib/presenter";

/** The `<sv-presenter>` element's steady-state width; shared by its initial mount and the resize nudge below. */
const PRESENTER_ELEMENT_WIDTH = "100%";

export interface UsePresenterOptions {
  /** The ref to the container element for the presenter stage. */
  stageRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * `<sv-presenter>`'s own connectedCallback() unconditionally sets
 * `this.style.display = 'block'` as an inline style and never reads
 * `hidden`/`hasAttribute('hidden')` back — an inline style always wins over
 * the UA stylesheet's `[hidden] { display: none }`, regardless of selector
 * specificity, so plain `el.hidden = true` is a no-op on this element. Set
 * `display` directly instead; this only overwrites the `display` property,
 * leaving the width/height/position it also sets inline untouched.
 */
function hidePresenter(el: Presenter, hide: boolean): void {
  el.style.display = hide ? "none" : "block";
}

export interface UsePresenter {
  /** True once the engine is loaded and the `<sv-presenter>` element is mounted. */
  mounted: boolean;
  ready: boolean;
  /** Set when the presenter engine (CDN script, WASM, etc.) fails to load. */
  loadError: Error | null;
  /** Re-runs the mount sequence after a `loadError`. */
  retry: () => void;
  /** True once the Connect key has been refused (401/403) — retrying it is futile. */
  keyRejected: boolean;
  resumeAudio: () => Promise<void>;
  initializeWithConnectKey: (
    connectKey: string,
    target: PresentationTarget,
  ) => Promise<void>;
  present: (content: string) => Promise<PresentationResult | undefined>;
  interruptPresentation: () => void;
  playMotion: (motionId: string) => Promise<PresentationResult | undefined>;
}

/**
 * Owns the imperative `<sv-presenter>` web component lifecycle: loads the engine
 * once, mounts the element into `stageRef`, wires status/token events, and
 * exposes typed imperative methods. Kept out of React Query because the
 * presenter is stateful and event-driven, not a fetchable resource.
 */
export function usePresenter(options: UsePresenterOptions): UsePresenter {
  const { stageRef } = options;
  const presenterRef = useRef<Presenter | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyRejected, setKeyRejected] = useState(false);
  // Bumping this re-runs the mount effect so a failed load can be retried.
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let disposed = false;
    const stage = stageRef.current;

    async function mount() {
      try {
        setLoadError(null);
        setKeyRejected(false);
        await loadPresenterEngine();
        if (disposed || !stage) return;

        const el = document.createElement("sv-presenter") as Presenter;
        el.style.width = PRESENTER_ELEMENT_WIDTH;
        el.style.height = "100%";
        el.addEventListener("PRESENTER_STATUS", (event) => {
          const { status: next } = (event as CustomEvent<{ status: string }>)
            .detail;
          if (next === "Ready") {
            hidePresenter(el, false);
            setReady(true);

            // Set a default FOV to avoid the default 90° vertical FOV, which is too narrow for most scenes.
            el.updateCameraFOV({
              distance: 1,
              vertical: 0,
              horizontal: 4.5,
            });

            // On first mount, the element goes from hidden (0x0) to visible, which is
            // itself a real resize that the presenter's internal ResizeObserver-driven
            // canvas scaling picks up. On a re-initialization (e.g. switching avatars)
            // the element is already visible and stays the same size, so that internal
            // resize logic never re-fires and the canvas keeps a stale scale. Nudge the
            // element's width by a pixel and back to force a genuine, ResizeObserver-
            // detectable size change and trigger it again.
            //
            // Both the nudge and the restore run inside their own rAF (nested, so the
            // restore is scheduled from within the nudge's frame) rather than one
            // synchronously plus a single rAF: this makes the two mutations land in two
            // distinct rendering steps regardless of which task queue PRESENTER_STATUS
            // happens to be dispatched from, so the browser is guaranteed to broadcast a
            // ResizeObserver notification between them. Restoring to the fixed
            // PRESENTER_ELEMENT_WIDTH constant (rather than an el.style.width read back
            // before the nudge) also means an overlapping Ready from a second
            // re-initialization can never leave the element permanently stuck at the
            // nudged width.
            requestAnimationFrame(() => {
              el.style.width = "calc(100% - 1px)";
              requestAnimationFrame(() => {
                el.style.width = PRESENTER_ELEMENT_WIDTH;
              });
            });
          } else {
            // A re-initialization (e.g. avatar/scene/voice switch) has started;
            // the previous presenter state is no longer valid until Ready fires again.
            // Re-hide the element (mirrors the initial mount) so the old scene's
            // lighting doesn't render alone during the gap before the new one loads.
            hidePresenter(el, true);
            setReady(false);
          }
        });
        el.addEventListener("CONNECT_KEY_REJECTED", () => {
          setKeyRejected(true);
        });
        // hidePresenter() must run after append(), not before: connectedCallback
        // (fired on connection) sets this.style.display = 'block' itself,
        // unconditionally, which would clobber a display:none set any earlier.
        stage.append(el);
        hidePresenter(el, true);
        presenterRef.current = el;
        setMounted(true);
      } catch (err) {
        if (!disposed) {
          const error = err instanceof Error ? err : new Error(String(err));
          setLoadError(error);
        }
      }
    }

    void mount();
    return () => {
      disposed = true;
      presenterRef.current?.remove();
      presenterRef.current = null;
      setMounted(false);
    };
  }, [stageRef, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const resumeAudio = useCallback(async () => {
    await presenterRef.current?.resumeAudioPlayback();
  }, []);

  const initializeWithConnectKey = useCallback(
    async (connectKey: string, target: PresentationTarget) => {
      // Hide immediately, synced with isLaunching rather than waiting for the
      // widget's own "Initializing" status — resolveTarget()'s network round
      // trip runs before that status fires, and el would otherwise still show
      // whatever was rendered before this call (the old scene on a switch)
      // for that whole window.
      if (presenterRef.current) hidePresenter(presenterRef.current, true);
      await presenterRef.current?.initializeWithConnectKey(connectKey, target);
    },
    [],
  );

  const playMotion = useCallback(async (motionId: string) => {
    return presenterRef.current?.playMotion(motionId);
  }, []);

  const present = useCallback(async (content: string) => {
    return presenterRef.current?.present(content);
  }, []);

  const interruptPresentation = useCallback(() => {
    presenterRef.current?.interruptPresentation();
  }, []);

  return {
    mounted,
    ready,
    loadError,
    retry,
    keyRejected,
    resumeAudio,
    initializeWithConnectKey,
    present,
    playMotion,
    interruptPresentation,
  };
}
