'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import SessionGuard from '@/components/SessionGuard';
import { getPhotos, Photo } from '@/lib/api';

const SLIDE_DURATION = 4000; // ms

function SlideshowContent() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPhotos()
      .then((data) => {
        const images = data.filter((p) => p.resource_type === 'image');
        setPhotos(images);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % photos.length);
    setProgress(0);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
    setProgress(0);
  }, [photos.length]);

  // Auto-advance
  useEffect(() => {
    if (!playing || photos.length <= 1) return;
    intervalRef.current = setInterval(goNext, SLIDE_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, photos.length, goNext]);

  // Progress bar
  useEffect(() => {
    if (!playing || photos.length === 0) return;
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
    }, 50);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [playing, currentIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">📸</div>
        <h1 className="text-3xl font-extrabold text-white">No photos yet</h1>
        <p className="text-white/60">No photos uploaded yet — be the first! 📸</p>
        <div className="flex gap-4">
          <Link href="/upload" className="btn-primary">Upload Photos</Link>
          <Link href="/dashboard" className="btn-secondary">← Back</Link>
        </div>
      </div>
    );
  }

  const current = photos[currentIndex];

  return (
    <div
      className="min-h-screen bg-black relative flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Full-screen image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image
            src={current.cloudinary_url}
            alt={`Photo by ${current.guest_first_name}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
            unoptimized
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Top bar (back button) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 z-20"
          >
            <Link href="/dashboard" className="btn-secondary py-2 px-4 text-sm">
              ← Back
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prev / Next arrows */}
      <AnimatePresence>
        {showControls && photos.length > 1 && (
          <>
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={goPrev}
              className="absolute left-4 z-20 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white text-xl transition-colors"
              aria-label="Previous"
            >
              ‹
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={goNext}
              className="absolute right-4 z-20 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white text-xl transition-colors"
              aria-label="Next"
            >
              ›
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Bottom info + controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6">
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-1 mb-4 overflow-hidden">
          <div
            className="progress-bar h-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-end justify-between">
          {/* Guest info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-white font-bold text-xl">
                {current.guest_first_name} {current.guest_last_name}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-4">
            {/* Play/pause */}
            <AnimatePresence>
              {showControls && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPlaying((p) => !p)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? '⏸' : '▶'}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Counter */}
            <p className="text-white/70 text-sm font-medium">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SlideshowPage() {
  return (
    <SessionGuard>
      <SlideshowContent />
    </SessionGuard>
  );
}
