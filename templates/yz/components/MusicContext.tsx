import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { wedding } from '../wedding';


interface MusicContextType {
  /** Musiqa tanlanmagan bo'lsa false — tugma ko'rsatilmaydi */
  enabled: boolean;
  isPlaying: boolean;
  /** Starts playback. Call synchronously inside a user gesture handler. */
  start: () => void;
  toggle: () => void;
}

const MusicContext = createContext<MusicContextType>({
  enabled: false,
  isPlaying: false,
  start: () => {},
  toggle: () => {},
});

export const useMusic = () => useContext(MusicContext);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const musicUrl = wedding().musicUrl;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.loop = true;
  }, []);

  const start = () => {
    const audio = audioRef.current;
    if (!audio || startedRef.current) return;
    startedRef.current = true;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      startedRef.current = true;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <MusicContext.Provider value={{ enabled: !!musicUrl, isPlaying, start, toggle }}>
      {musicUrl && <audio ref={audioRef} src={musicUrl} preload="auto" />}
      {children}
    </MusicContext.Provider>
  );
};
