import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Speech from "expo-speech";

export interface TtsSegment {
  seg_id: number;
  text: string;
  speak?: boolean;
}

export interface VoiceOption {
  identifier: string;
  name: string;
  language: string;
}

export const RATE_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

interface UseTtsArgs {
  segments: TtsSegment[];
  language?: string;
  contentKey?: string; // resets playback when content changes
}

export function useTTS({ segments, language, contentKey }: UseTtsArgs) {
  const speakable = useMemo(() => segments.filter((s) => s.speak !== false), [segments]);

  const idxRef = useRef(0);
  const playingRef = useRef(false);
  const genRef = useRef(0);
  const rateRef = useRef(1.0);
  const voiceRef = useRef<string | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSegId, setActiveSegId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [rate, setRateState] = useState(1.0);
  const [voiceId, setVoiceIdState] = useState<string | undefined>(undefined);
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((vs) =>
        setVoices(
          (vs || []).map((v: any) => ({
            identifier: v.identifier,
            name: v.name || v.identifier,
            language: v.language,
          })),
        ),
      )
      .catch(() => setVoices([]));
  }, []);

  const hardStop = useCallback(() => {
    genRef.current += 1;
    playingRef.current = false;
    Speech.stop();
  }, []);

  // Reset when content or available content changes.
  useEffect(() => {
    hardStop();
    idxRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSegId(null);
    setProgress(0);
  }, [contentKey, hardStop]);

  // Stop on unmount.
  useEffect(() => () => Speech.stop(), []);

  const finish = useCallback(() => {
    playingRef.current = false;
    idxRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSegId(null);
    setProgress(1);
  }, []);

  const speakAt = useCallback(
    (i: number) => {
      if (i >= speakable.length) {
        finish();
        return;
      }
      const gen = ++genRef.current;
      idxRef.current = i;
      const seg = speakable[i];
      setActiveSegId(seg.seg_id);
      setProgress(speakable.length ? i / speakable.length : 0);
      Speech.speak(seg.text, {
        language: language || undefined,
        rate: rateRef.current,
        voice: voiceRef.current,
        onDone: () => {
          if (gen === genRef.current && playingRef.current) speakAt(i + 1);
        },
        onError: () => {
          if (gen === genRef.current && playingRef.current) speakAt(i + 1);
        },
      });
    },
    [speakable, language, finish],
  );

  const play = useCallback(
    (startSegId?: number) => {
      hardStop();
      let startIdx = 0;
      if (startSegId != null) {
        const found = speakable.findIndex((s) => s.seg_id === startSegId);
        startIdx = found >= 0 ? found : 0;
      }
      playingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      // slight delay so the previous stop fully flushes (Android)
      setTimeout(() => speakAt(startIdx), 60);
    },
    [hardStop, speakAt, speakable],
  );

  const pause = useCallback(() => {
    hardStop();
    setIsPlaying(false);
    setIsPaused(true);
  }, [hardStop]);

  const resume = useCallback(() => {
    playingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setTimeout(() => speakAt(idxRef.current), 60);
  }, [speakAt]);

  const stop = useCallback(() => {
    hardStop();
    idxRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSegId(null);
    setProgress(0);
  }, [hardStop]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else if (isPaused) resume();
    else play();
  }, [isPlaying, isPaused, pause, resume, play]);

  const setRate = useCallback(
    (r: number) => {
      rateRef.current = r;
      setRateState(r);
      if (playingRef.current) {
        hardStop();
        playingRef.current = true;
        setIsPlaying(true);
        setTimeout(() => speakAt(idxRef.current), 60);
      }
    },
    [hardStop, speakAt],
  );

  const setVoiceId = useCallback(
    (id: string | undefined) => {
      voiceRef.current = id;
      setVoiceIdState(id);
      if (playingRef.current) {
        hardStop();
        playingRef.current = true;
        setIsPlaying(true);
        setTimeout(() => speakAt(idxRef.current), 60);
      }
    },
    [hardStop, speakAt],
  );

  return {
    isPlaying,
    isPaused,
    isActive: isPlaying || isPaused,
    activeSegId,
    progress,
    rate,
    setRate,
    voices,
    voiceId,
    setVoiceId,
    play,
    pause,
    resume,
    stop,
    togglePlay,
  };
}
