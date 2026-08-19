"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { parseVideo } from "@/lib/fampire/video";

/**
 * The hero's moving image.
 *
 * Architecture rule: we do not host media. The hero plays the client's own
 * Vimeo master rather than an MP4 copied into public/, so the catalog premise
 * stays honest on the most visible surface on the site, and the client can
 * change the hero by editing one object in lib/fampire/media.ts.
 *
 * Two things make it feel instant rather than "a video that eventually starts":
 *
 *  1. The iframe mounts on the FIRST render — while the preloader is still
 *     covering the screen — so the player fetches its manifest and first
 *     segments during the curtain rather than after it.
 *  2. The preloader will not part until this component reports the picture is
 *     moving (`fampire:hero-ready`), or until its own deadline, whichever comes
 *     first. A visitor therefore never watches the loading happen.
 *
 * Sound: there is no control. The hero is meant to arrive with audio, so the
 * component simply keeps asking for it until the player confirms it has it —
 * on ready, on first playback, on every qualifying user gesture, and on a
 * short poll after that. `background=1` is deliberately NOT used, because that
 * mode force-mutes the player and ignores volume calls entirely.
 *
 * What cannot be engineered away: browsers refuse audible autoplay until the
 * visitor has interacted with the page. The preloader's entry click is that
 * interaction, and because activation is sticky for the life of the document,
 * it also covers every later return to this page within the same visit — the
 * component just has to re-acquire the sound on each remount, which is what
 * the nudge below does.
 */

/** Both the preloader and this component agree on this name. */
export const HERO_READY_EVENT = "fampire:hero-ready";

const ORIGIN = "https://player.vimeo.com";

/**
 * Whether this DOCUMENT has ever had audible playback.
 *
 * Module scope, not component state, and that is the point. Navigating to the
 * Films page and back unmounts and remounts this component with a brand new
 * iframe that starts muted all over again — but user activation is sticky for
 * the life of the document, so the sound is still *permitted*, it just has to
 * be asked for again. Remembering that we already won once lets the remount
 * ask immediately and keep asking, instead of behaving like a cold first
 * visit. Client-side navigation never reloads the document, so this survives
 * exactly as long as the activation it is tracking.
 */
let documentHasHadSound = false;

export default function HeroVideo({
  videoId,
  poster,
  title,
  /** Seconds to skip — the trailer opens on a burned-in title card. */
  startAt = 0,
  /**
   * Whether the server confirmed the player will actually serve this embed.
   *
   * A cross-origin iframe never tells the page it got a 401, so without this
   * the component could only infer failure from silence — it sat on a dead
   * frame for eleven seconds before falling back. Checked once on the server
   * (lib/fampire/hero.ts), the still renders immediately instead.
   */
  embeddable = true,
}: {
  videoId: string;
  poster: string;
  title: string;
  startAt?: number;
  embeddable?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const ytFrameRef = useRef<HTMLIFrameElement | null>(null);
  const playingRef = useRef(false);
  /** When the player last reported progress — see the watchdog below. */
  const lastTickRef = useRef(0);
  const readyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Whether the player currently has audio. Not surfaced as a control — it
   *  drives whether we keep trying. */
  const audibleRef = useRef(false);

  const reduceMotion = useReducedMotion();
  const showStill = failed || reduceMotion === true || !embeddable;
  const parsed = parseVideo(videoId);
  const isYouTube = parsed?.kind === "youtube";

  const send = useCallback((method: string, value?: unknown) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ method, value }), ORIGIN);
  }, []);

  const unmute = useCallback(() => {
    send("setMuted", false);
    send("setVolume", 1);
  }, [send]);

  /**
   * The iframe's `load` event is NOT evidence of playback — it fires just as
   * happily for an error page, and for a frame still fetching its first HLS
   * segment. Vimeo's postMessage protocol gives a real signal: the player
   * announces `ready`, we subscribe, and only a `play` or a `timeupdate` past
   * the start point counts as running.
   */
  useEffect(() => {
    /**
     * Declared FIRST, above every early return.
     *
     * `releasePreloader` is a function declaration, so it hoists — but the
     * `released` flag it closes over is a `let`, which does not. Calling the
     * function above this line therefore threw `Cannot access 'released'
     * before initialization` and killed the whole effect, so the curtain never
     * lifted at all.
     *
     * It only fired on the `!embeddable` path, which is the path this site is
     * actually on: Vimeo returns 401 for the hero video until the client
     * allowlists the domain. The failure mode was invisible to server-side
     * checks — the HTML was perfect and the page was broken.
     *
     * Two separate concerns, and conflating them is a bug worth naming: the
     * preloader must lift on a deadline no matter what, but the iframe must
     * only be REVEALED on real playback. Fading it in on the deadline shows
     * whatever the frame actually contains — including Vimeo's "we couldn't
     * verify the security of your connection" page.
     */
    let released = false;
    function releasePreloader() {
      if (released) return;
      released = true;
      window.dispatchEvent(new Event(HERO_READY_EVENT));
    }
    function markPlaying() {
      if (playingRef.current) return;
      playingRef.current = true;
      setPlaying(true);
      releasePreloader();
      // The player is definitely live now, which is the best moment to ask.
      unmute();
    }

    // Nothing to wait for when the embed is known-refused, when the visitor
    // has asked for less motion, or when this is a YouTube video: everything
    // below this line is Vimeo's postMessage handshake, listening only to
    // messages from player.vimeo.com. A YouTube iframe never sends those, so
    // without this check `playingRef` would never flip true, the 11-second
    // `giveUp` timer below would always fire, and the component would swap
    // to the poster out from under a YouTube video that was actually playing
    // fine the whole time — audio included, since nothing here ever told
    // that iframe to stop. YouTube's own autoplay+loop needs no verification.
    if (!embeddable || reduceMotion === true || isYouTube) {
      releasePreloader();
      return;
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== ORIGIN) return;
      let data = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;

      if (data.event === "ready") {
        readyRef.current = true;
        send("addEventListener", "play");
        send("addEventListener", "timeupdate");
        send("addEventListener", "volumechange");
        send("addEventListener", "ended");
        send("addEventListener", "pause");
        // Two loops, layered, because they fail in opposite directions.
        //
        // `loop=1` stays in the embed URL as the FALLBACK: if this API
        // handshake never happens — blocked player, hostile network — the
        // native loop still keeps the hero moving forever. It is the worse
        // loop (it rewinds to zero, replaying the burned-in title card that
        // `startAt` exists to skip) but it is unconditional.
        //
        // Once we ARE talking to the player, turn it off and take over: the
        // native loop suppresses `ended`, and the timeupdate handler below
        // seeks back BEFORE the end so the player never reaches its final
        // frame at all. Reaching it is the visible "the video stopped".
        send("setLoop", false);
        // Some browsers stall an autoplaying iframe that mounted while it was
        // still visually covered; an explicit play is harmless if it is
        // already running and unsticks it if it is not.
        send("play");
        // Ask for sound immediately. The embed URL carries muted=1 because
        // that is the only way autoplay is guaranteed to start at all; this
        // turns it straight back up. Whether the browser honours it depends
        // on whether this visitor has interacted with the site before, so
        // `volumechange` decides what the control actually says.
        unmute();
        return;
      }

      if (data.event === "volumechange") {
        audibleRef.current = Number(data.data?.volume ?? 0) > 0;
        if (audibleRef.current) documentHasHadSound = true;
        return;
      }

      // Backstop, for the case where a seek lands past the end anyway.
      if (data.event === "ended") {
        send("setCurrentTime", startAt);
        send("play");
        return;
      }

      // A hero that has silently stopped is worse than one that never started.
      // Vimeo pauses on some tab-visibility transitions and after a stalled
      // segment; nudge it back rather than leaving a frozen frame.
      if (data.event === "pause" && playingRef.current && !document.hidden) {
        send("play");
        return;
      }
      if (data.event === "timeupdate") {
        const seconds = Number(data.data?.seconds ?? 0);
        const duration = Number(data.data?.duration ?? 0);
        lastTickRef.current = Date.now();
        if (seconds > startAt + 0.15) markPlaying();

        // The actual loop: seek back a beat BEFORE the end. Waiting for
        // `ended` means the player has already stopped and shown its final
        // frame, which is the visible "the video stopped" the whole exercise
        // is trying to avoid.
        if (duration > 0 && duration - seconds <= 0.75) {
          send("setCurrentTime", startAt);
          send("play");
        }
        return;
      }

      if (data.event === "play") markPlaying();
    }

    window.addEventListener("message", onMessage);

    // Returning to the tab after it was backgrounded is the other way a
    // background video ends up frozen.
    function onVisible() {
      if (!document.hidden && playingRef.current) send("play");
    }
    document.addEventListener("visibilitychange", onVisible);

    // Watchdog. `timeupdate` fires several times a second while a video is
    // running, so a gap means it has stopped — whether it paused, stalled on a
    // segment, or ended in a way that never reached us. Cheap, and it is the
    // difference between "usually loops" and "cannot stop looping".
    const watchdog = setInterval(() => {
      if (!playingRef.current || document.hidden) return;
      if (Date.now() - lastTickRef.current > 3000) send("play");
    }, 2000);

    /**
     * Getting the sound on, given that browsers refuse audible autoplay until
     * this visitor has interacted with the page.
     *
     * The previous version tried exactly once, on the first gesture. That is
     * why the audio "took a while" or never arrived: the single attempt often
     * raced the player — fired before it was ready, or before it had resumed
     * after the preloader — and once spent there was nothing left to try
     * again with.
     *
     * Now every qualifying gesture retries until the player confirms it is
     * audible, and the listeners then remove themselves. `pointerdown`,
     * `keydown` and `touchstart` are the events that actually count as
     * activation — scroll and mousemove do not, which is worth knowing before
     * wondering why scrolling alone never turned the sound on.
     */
    const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;
    function onGesture() {
      if (audibleRef.current) {
        GESTURES.forEach((g) => window.removeEventListener(g, onGesture, true));
        return;
      }
      unmute();
    }
    // Capture phase, so a gesture is seen even when something in the page
    // stops it propagating.
    GESTURES.forEach((g) => window.addEventListener(g, onGesture, true));

    // And keep asking for a short while after the player starts. On a return
    // visit the site already has activation, so the request succeeds without
    // any gesture at all — it just has to be made after the player is
    // listening, which is not necessarily the first time we ask.
    // Keep asking until the player confirms it has audio.
    //
    // On a return visit this is what actually delivers the sound: the document
    // already has activation from the curtain, so the request will be granted
    // — it just has to land after the fresh player is listening, which is
    // rarely the first time we ask. The window is longer when we know sound
    // has worked in this document before, because then it is not a question of
    // whether we are allowed, only of timing.
    const nudge = setInterval(() => {
      if (audibleRef.current) return;
      unmute();
    }, 700);
    const stopNudging = setTimeout(
      () => clearInterval(nudge),
      documentHasHadSound ? 30_000 : 12_000,
    );

    // Must never outlast the preloader's own cap, or a visitor on a slow
    // connection is held behind the curtain.
    const release = setTimeout(releasePreloader, 2400);
    // And this decides the video is genuinely not coming, so the panel settles
    // on the still rather than sitting on a dead frame forever.
    const giveUp = setTimeout(() => {
      if (!playingRef.current) setFailed(true);
    }, 11_000);

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
      GESTURES.forEach((g) => window.removeEventListener(g, onGesture, true));
      clearInterval(nudge);
      clearTimeout(stopNudging);
      clearTimeout(release);
      clearTimeout(giveUp);
      clearInterval(watchdog);
      // A curtain that never lifts is worse than an unplayed video.
      releasePreloader();
    };
  }, [reduceMotion, startAt, send, unmute, embeddable, isYouTube]);

  /**
   * YouTube's own sound-acquisition loop.
   *
   * The `mute=1` in the embed URL is what guarantees autoplay starts at all —
   * browsers refuse audible autoplay before the visitor has interacted with
   * the page. The Vimeo path above has an entire gesture-triggered unmute
   * loop for exactly this reason; the YouTube branch had none, so a YouTube
   * hero video was permanently silent no matter how the visitor interacted
   * with the page. This is that same loop, aimed at the YouTube iframe API
   * (`postMessage({event:"command", func:"unMute"})`) instead of Vimeo's.
   */
  useEffect(() => {
    if (!isYouTube || showStill) return;
    const sendYt = (func: string, args: unknown[] = []) =>
      ytFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "https://www.youtube-nocookie.com",
      );
    const tryUnmute = () => {
      sendYt("unMute");
      sendYt("setVolume", [100]);
    };

    const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;
    function onGesture() {
      tryUnmute();
    }
    GESTURES.forEach((g) => window.addEventListener(g, onGesture, true));

    // Ask immediately (covers a return visit, where activation already
    // exists) and keep asking for a while — the iframe is not necessarily
    // listening on the very first attempt.
    tryUnmute();
    const nudge = setInterval(tryUnmute, 700);
    const stopNudging = setTimeout(() => clearInterval(nudge), 12_000);

    return () => {
      GESTURES.forEach((g) => window.removeEventListener(g, onGesture, true));
      clearInterval(nudge);
      clearTimeout(stopNudging);
    };
  }, [isYouTube, showStill]);

  /**
   * YouTube gets a plain embed, deliberately.
   *
   * The Vimeo path below carries a lot of machinery — a postMessage handshake,
   * a sound-acquisition loop, a stall watchdog. Reimplementing all of that
   * against the YouTube iframe API would double the surface for a fallback
   * source. Autoplay muted and looping is what the hero actually needs, and it
   * is what both services allow without user interaction.
   */
  if (parsed?.kind === "youtube" && !showStill) {
    const yt =
      `https://www.youtube-nocookie.com/embed/${parsed.id}` +
      `?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&modestbranding=1` +
      `&rel=0&playsinline=1&disablekb=1&enablejsapi=1${startAt ? `&start=${startAt}` : ""}`;
    return (
      <div className="absolute inset-0 overflow-hidden bg-fam-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.78]"
        />
        <iframe
          ref={ytFrameRef}
          src={yt}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2"
        />
      </div>
    );
  }

  const src =
    `${ORIGIN}/video/${parsed?.id ?? videoId}` +
    `?autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0&playsinline=1&dnt=1` +
    (startAt ? `#t=${startAt}s` : "");

  return (
    <div className="absolute inset-0 overflow-hidden bg-fam-ink">
      {/* The skeleton is the BASE layer, not a fallback state: it paints
          instantly so the panel is never black, and the video fades over it
          once genuinely running. It matters most on a RETURN visit, where the
          preloader is suppressed (once per tab session) and nothing else is
          covering the panel while the player reconnects.

          A real photograph, shown sharp and only slightly dimmed — not the
          video's own auto-thumbnail, which for this trailer lands
          mid-title-card with burned-in type cut off mid-word. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full object-cover brightness-[0.78] transition-opacity duration-700 ${
          playing ? "opacity-0" : "opacity-100"
        }`}
      />

      {showStill ? null : (
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
          className={`pointer-events-none absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
          /* The panel is 16:9, the same shape as the film, so the frame fills
             it exactly — no cover-crop and nothing cut off the sides. */
        />
      )}

    </div>
  );
}
