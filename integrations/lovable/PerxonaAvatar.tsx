// PerxonaAvatar: a talking 3D avatar for a React + Vite app (Lovable, or any other).
//
// Drop this file in src/components/. It needs only the PUBLISHABLE Connect key, which is
// meant to be readable by the browser, so it can live in src/config/perxona.ts. Never put the
// SECRET key in any frontend file.
//
// Usage:
//   const avatar = useRef<PerxonaAvatarHandle>(null);
//   <PerxonaAvatar ref={avatar} publishableKey={PERXONA.publishableKey} region="asia" />
//
//   async function onSend() {
//     avatar.current?.unlockAudio();          // FIRST line of the click/submit handler
//     const reply = await yourAgent(text);    // Lovable AI, a Perxona chatbot, anything
//     await avatar.current?.speak(reply);
//   }
//
// Browsers allow sound only from a user gesture, so unlockAudio() must run inside the click
// or submit handler, before any await. An avatar that talks on page load cannot exist.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

// Teach TypeScript the <sv-presenter> tag: React 19 types read React.JSX, older ones the global JSX.
type SvPresenterProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "sv-presenter": SvPresenterProps;
    }
  }
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "sv-presenter": SvPresenterProps;
    }
  }
}

type PresentationResult = { success: boolean; code: string; message?: string };
type PresenterElement = HTMLElement & {
  initializeWithConnectKey(key: string, target: { avatarId: string; sceneId: string; voiceId?: string }): Promise<void>;
  resumeAudioPlayback(): Promise<void>;
  present(text: string): Promise<PresentationResult>;
  interruptPresentation(): void;
  setThinking?(on: boolean): void;
  playMotion?(motionId: string): void;
};

export type AvatarStatus = "loading" | "ready" | "error";

export type PerxonaAvatarHandle = {
  /** Call first thing in a click/submit handler, before any await. */
  unlockAudio(): void;
  /** Speak text with lip-sync. Resolves when queued; never throws. */
  speak(text: string): Promise<PresentationResult>;
  /** Show or hide the "thinking" pose while your agent works. */
  setThinking(on: boolean): void;
  /** Stop talking and clear the queue. */
  stop(): void;
};

type Props = {
  publishableKey: string;
  region?: "asia" | "eu";
  /** Leave all three empty to use the first avatar, scene and voice in the catalog. */
  avatarId?: string;
  sceneId?: string;
  voiceId?: string;
  className?: string;
  onStatus?: (status: AvatarStatus, detail?: string) => void;
};

// The engine registers <sv-presenter> once per page.
let engineLoad: Promise<void> | null = null;
function loadEngine(region: string) {
  if (!engineLoad) {
    const src = `https://cdn.perxona.ai/${region}/prod/connect/latest/widget/entry/presenter.js`;
    engineLoad = new Promise((resolve, reject) => {
      const s = Object.assign(document.createElement("script"), {
        type: "module",
        src,
        onload: () => resolve(),
        onerror: () => {
          engineLoad = null;
          reject(new Error(`Presenter engine failed to load: ${src}`));
        },
      });
      document.head.append(s);
    });
  }
  return engineLoad;
}

async function firstId(api: string, key: string, path: string, field: string): Promise<string> {
  // X-Connect-Key only: an Authorization header on the same request is rejected with 400.
  const res = await fetch(`${api}${path}?size=1`, { headers: { "X-Connect-Key": key } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  const id = (await res.json()).items?.[0]?.[field];
  if (!id) throw new Error(`${path} returned no items`);
  return id;
}

export const PerxonaAvatar = forwardRef<PerxonaAvatarHandle, Props>(function PerxonaAvatar(
  { publishableKey, region = "asia", avatarId, sceneId, voiceId, className, onStatus },
  ref,
) {
  const el = useRef<PresenterElement>(null);
  const started = useRef(false); // React StrictMode runs effects twice in development
  const unlocked = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("loading");

  const report = (s: AvatarStatus, detail?: string) => {
    setStatus(s);
    onStatus?.(s, detail);
    if (s === "error") console.error("PerxonaAvatar:", detail);
  };

  useEffect(() => {
    const node = el.current;
    if (!node || started.current) return;
    started.current = true;

    // Ready and Failed only ever arrive as events, so listen before initializing. Failed comes
    // after initializeWithConnectKey() has resolved, when the stage cannot come up (for example,
    // an avatar that will not load); detail.message says why. Remount to try again.
    const onPresenterStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status === "Ready") report("ready");
      if (detail?.status === "Failed") report("error", `Avatar failed to start: ${detail.message ?? "unknown reason"}`);
    };
    // A rejected key never recovers by retrying: it is revoked, expired, or not allowed on
    // this domain. Fix it in the Perxona Console, then reload.
    const onRejected = () =>
      report("error", "Connect key rejected: use the publishable key and allow this domain in the Console.");
    node.addEventListener("PRESENTER_STATUS", onPresenterStatus);
    node.addEventListener("CONNECT_KEY_REJECTED", onRejected);

    const api = `https://console.perxona.ai/${region}/api/v1/connect`;
    (async () => {
      try {
        // An avatar and a scene go together; present() needs a voice.
        const [a, s, v] = await Promise.all([
          avatarId || firstId(api, publishableKey, "/assets/avatars", "avatar_id"),
          sceneId || firstId(api, publishableKey, "/assets/scenes", "scene_id"),
          voiceId || firstId(api, publishableKey, "/voices", "id"),
        ]);
        await loadEngine(region);
        await customElements.whenDefined("sv-presenter");
        await node.initializeWithConnectKey(publishableKey, { avatarId: a, sceneId: s, voiceId: v });
      } catch (err) {
        report("error", err instanceof Error ? err.message : String(err));
      }
    })();
    // Initialize once per mount: the presenter keeps its own speech token fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    unlockAudio() {
      unlocked.current ??= el.current?.resumeAudioPlayback() ?? null;
    },
    async speak(text: string) {
      const node = el.current;
      if (!node || status !== "ready") return { success: false, code: "NOT_READY", message: "Avatar is not ready yet." };
      await unlocked.current;
      node.setThinking?.(false);
      // present() never rejects; the result says whether it worked.
      const result = await node.present(text);
      if (!result.success) console.warn("PerxonaAvatar: present() failed", result.code, result.message);
      return result;
    },
    setThinking(on: boolean) {
      el.current?.setThinking?.(on);
    },
    stop() {
      el.current?.interruptPresentation();
    },
  }));

  return <sv-presenter ref={el} className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
});
