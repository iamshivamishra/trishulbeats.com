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

/* ── Actions context ── */

interface AudioActionsContextType {
  currentBeat: PlayableBeat | null;
  isPlaying: boolean;
  volume: number;
  playlist: PlayableBeat[];
  setPlaylist: (beats: PlayableBeat[]) => void;
  playBeat: (beat: PlayableBeat, newPlaylist?: PlayableBeat[]) => void;
  togglePlay: () => void;
  seek: (percent: number) => void;
  setVolume: (v: number) => void;
  closePlayer: () => void;
  playNext: () => void;
  playPrevious: () => void;
}

/* ── Progress context ── */

interface AudioProgressContextType {
  progress: number;
  duration: number;
  currentTime: number;
}

const AudioActionsContext = createContext<AudioActionsContextType | null>(null);
const AudioProgressContext = createContext<AudioProgressContextType | null>(null);

type AudioPlayerContextType = AudioActionsContextType & AudioProgressContextType;

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<PlayableBeat | null>(null);
  const [playlist, setPlaylistState] = useState<PlayableBeat[]>([]);
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
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  const playNext = useCallback(() => {
    const list = playlistRef.current;
    const current = currentBeatRef.current;
    if (!current) return;

    if (!list.length) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = list.findIndex((b) => b.id === current.id);
    if (currentIndex !== -1 && currentIndex < list.length - 1) {
      const nextBeat = list[currentIndex + 1];
      const audio = audioRef.current;
      if (audio) {
        setCurrentBeat(nextBeat);
        audio.src = nextBeat.previewUrl;
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    } else {
      // Playlist ke end par first track loop karega
      const firstBeat = list[0];
      const audio = audioRef.current;
      if (audio && firstBeat) {
        setCurrentBeat(firstBeat);
        audio.src = firstBeat.previewUrl;
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  }, []);


 const playPrevious = useCallback(() => {
    const list = playlistRef.current;
    const current = currentBeatRef.current;
    if (!current) return;

    if (!list.length || audioRef.current?.currentTime! > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = list.findIndex((b) => b.id === current.id);
    if (currentIndex > 0) {
      const prevBeat = list[currentIndex - 1];
      const audio = audioRef.current;
      if (audio) {
        setCurrentBeat(prevBeat);
        audio.src = prevBeat.previewUrl;
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);
  
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      // Beat khatam hone par auto next play karega
      playNext();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [playNext]);

  const setPlaylist = useCallback((beats: PlayableBeat[]) => {
    setPlaylistState(beats);
  }, []);

  const playBeat = useCallback((beat: PlayableBeat, newPlaylist?: PlayableBeat[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (newPlaylist) {
      setPlaylistState(newPlaylist);
    }

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
      playlist,
      setPlaylist,
      playBeat,
      togglePlay,
      seek,
      setVolume,
      closePlayer,
      playNext,
      playPrevious,
    }),
    [
      currentBeat,
      isPlaying,
      volume,
      playlist,
      setPlaylist,
      playBeat,
      togglePlay,
      seek,
      setVolume,
      closePlayer,
      playNext,
      playPrevious,
    ]
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

export function useAudioActions() {
  const ctx = useContext(AudioActionsContext);
  if (!ctx) throw new Error("useAudioActions must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioProgress() {
  const ctx = useContext(AudioProgressContext);
  if (!ctx) throw new Error("useAudioProgress must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioPlayer(): AudioPlayerContextType {
  const actions = useAudioActions();
  const progress = useAudioProgress();
  return { ...actions, ...progress };
}