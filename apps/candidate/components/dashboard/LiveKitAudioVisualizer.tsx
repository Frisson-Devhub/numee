"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 5;
/** Floor so idle audio still shows a resting bar rather than collapsing to nothing. */
const MIN_SCALE = 0.08;
/** Frequency energy is well under full scale for speech; lift it so bars use the height. */
const GAIN = 1.6;

/**
 * Bar visualizer for a LiveKit audio track.
 *
 * Reads the agent's remote track through a Web Audio `AnalyserNode` rather than pulling in
 * `@livekit/components-react`: the assistant drives `livekit-client` imperatively, and the
 * React components library would need the whole tree wrapped in its Room context.
 *
 * The analyser is deliberately NOT connected to `ctx.destination` — the caller already
 * attaches the track to an `<audio>` element for playback, and routing it here as well
 * would double the audio. That attached element is also what keeps the remote track
 * flowing, which a `MediaStreamAudioSourceNode` needs to produce anything but silence.
 *
 * Bars are written straight to the DOM in the animation frame; putting levels in state
 * would re-render the assistant ~60 times a second.
 */
export function LiveKitAudioVisualizer({
  track,
  className = "",
}: {
  /** Remote agent audio, or null before it arrives. */
  track: MediaStreamTrack | null;
  className?: string;
}) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (!track) return;

    const AudioContextCtor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    let context: AudioContext;
    let source: MediaStreamAudioSourceNode;
    let analyser: AnalyserNode;
    try {
      context = new AudioContextCtor();
      source = context.createMediaStreamSource(new MediaStream([track]));
      analyser = context.createAnalyser();
    } catch {
      return; // visualisation is decorative; never break the conversation over it
    }

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const binsPerBar = Math.max(1, Math.floor(spectrum.length / BAR_COUNT));
    let frame = 0;

    const render = () => {
      analyser.getByteFrequencyData(spectrum);
      for (let bar = 0; bar < BAR_COUNT; bar += 1) {
        let total = 0;
        for (let bin = 0; bin < binsPerBar; bin += 1) {
          total += spectrum[bar * binsPerBar + bin] ?? 0;
        }
        const level = total / binsPerBar / 255;
        const node = barsRef.current[bar];
        if (node) {
          node.style.transform = `scaleY(${Math.min(1, Math.max(MIN_SCALE, level * GAIN))})`;
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    // Autoplay policies can start the context suspended until a user gesture.
    void context.resume().catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // ignore
      }
      void context.close().catch(() => {});
    };
  }, [track]);

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 ${className}`}
      role="img"
      aria-label="Assistant audio activity"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(node) => {
            barsRef.current[i] = node;
          }}
          className="h-24 w-3 origin-center rounded-full bg-gradient-to-b from-indigo-300 to-indigo-500 sm:h-32 sm:w-4"
          style={{ transform: `scaleY(${MIN_SCALE})`, transition: "transform 60ms linear" }}
        />
      ))}
    </div>
  );
}
