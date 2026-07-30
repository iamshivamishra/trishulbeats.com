"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";

export interface PlayableBeat {
  id: string;
  title: string;
  producerName: string;
  coverUrl?: string;
  previewUrl: string;
  packId?: string;
}

/* ── Actions context (stable — identity-stable callbacks via refs) ── */

interface AudioActionsContextType {
  currentBeat: PlayableBeat | null;
  isPlaying: boolean;
  volume: number;
  playBeat: (beat: PlayableBeat) => void;
  togglePlay: () => void;
  seek: (percent: number) => void;
  setVolume: (v: number) => void;
  closePlayer: () => void;
}

/* ── Progress context (high-frequency — 60 fps timeupdate) ── */

interface AudioProgressContextType {
  progress: number;
  duration: number;
  currentTime: number;
}

const AudioActionsContext = createContext<AudioActionsContextType | null>(null);
const AudioProgressContext = createContext<AudioProgressContextType | null>(null);

/* ── Legacy combined type for backward-compat export ── */

type AudioPlayerContextType = AudioActionsContextType & AudioProgressContextType;

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<PlayableBeat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep refs for stable callbacks
  const currentBeatRef = useRef(currentBeat);
  currentBeatRef.current = currentBeat;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, []);

  const playBeat = useCallback((beat: PlayableBeat) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentBeatRef.current?.id === beat.id) {
      if (isPlayingRef.current) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    setCurrentBeat(beat);
    audio.src = beat.previewUrl;
    audio.currentTime = 0;
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentBeatRef.current) return;
    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, []);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    const dur = durationRef.current;
    if (!audio || !dur) return;
    const time = (percent / 100) * dur;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    setVolumeState(v);
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setIsPlaying(false);
    setCurrentBeat(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const actionsValue = useMemo<AudioActionsContextType>(
    () => ({
      currentBeat,
      isPlaying,
      volume,
      playBeat,
      togglePlay,
      seek,
      setVolume,
      closePlayer,
    }),
    [currentBeat, isPlaying, volume, playBeat, togglePlay, seek, setVolume, closePlayer]
  );

  const progressValue = useMemo<AudioProgressContextType>(
    () => ({ progress, duration, currentTime }),
    [progress, duration, currentTime]
  );

  return (
    <AudioActionsContext.Provider value={actionsValue}>
      <AudioProgressContext.Provider value={progressValue}>
        {children}
      </AudioProgressContext.Provider>
    </AudioActionsContext.Provider>
  );
}

/**
 * Subscribe to actions only (stable, no re-renders during playback).
 * Use in BeatCard, PackBeatUploader, BeatPacksClient, etc.
 */
export function useAudioActions() {
  const ctx = useContext(AudioActionsContext);
  if (!ctx) throw new Error("useAudioActions must be used within AudioPlayerProvider");
  return ctx;
}

/**
 * Subscribe to high-frequency progress updates.
 * Use only in BottomPlayer, Waveform, TrackProgressBar.
 */
export function useAudioProgress() {
  const ctx = useContext(AudioProgressContext);
  if (!ctx) throw new Error("useAudioProgress must be used within AudioPlayerProvider");
  return ctx;
}

/**
 * Legacy combined hook — subscribers get ALL re-renders.
 * Prefer useAudioActions() or useAudioProgress() for new code.
 */
export function useAudioPlayer(): AudioPlayerContextType {
  const actions = useAudioActions();
  const progress = useAudioProgress();
  return { ...actions, ...progress };
}
