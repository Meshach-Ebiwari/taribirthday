'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import SessionGuard from '@/components/SessionGuard';
import { getPhotos, Photo } from '@/lib/api';
import { getSocket } from '@/lib/socket';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PhotoCard({ photo, onClick }: { photo: Photo; onClick: (p: Photo) => void }) {
  const src = photo.thumbnail_url || photo.cloudinary_url;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.35 }}
      className="relative group cursor-pointer overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/50 transition-all"
      onClick={() => onClick(photo)}
    >
      <div className="relative w-full aspect-square">
        <Image
          src={src}
          alt={`Photo by ${photo.guest_first_name}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
        />

        {/* Video play overlay */}
        {photo.resource_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
              <span className="text-xl ml-1">▶</span>
            </div>
          </div>
        )}

        {/* Guest name badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <p className="text-white font-semibold text-sm truncate">
            {photo.guest_first_name} {photo.guest_last_name}
          </p>
          <p className="text-white/60 text-xs">{timeAgo(photo.created_at)}</p>
        </div>
      </div>
    </motion.div>
  );
}

function LightboxModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-0 right-0 z-10 text-white/60 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>

        {photo.resource_type === 'video' ? (
          <video
            src={photo.cloudinary_url}
            controls
            autoPlay
            className="max-w-full max-h-[75vh] rounded-xl"
          />
        ) : (
          <div className="relative w-full max-h-[75vh] flex items-center justify-center">
            <Image
              src={photo.cloudinary_url}
              alt={`Photo by ${photo.guest_first_name}`}
              width={photo.width || 800}
              height={photo.height || 600}
              className="object-contain max-h-[75vh] rounded-xl"
              unoptimized
            />
          </div>
        )}

        <div className="text-center">
          <p className="text-white font-semibold">
            {photo.guest_first_name} {photo.guest_last_name}
          </p>
          <p className="text-white/50 text-sm">{timeAgo(photo.created_at)}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GalleryContent() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    const socket = getSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    if (socket.connected) setConnected(true);

    socket.on('photo:new', (photo: Photo) => {
      setPhotos((prev) => [photo, ...prev]);
    });

    return () => {
      socket.off('photo:new');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [fetchPhotos]);

  return (
    <div className="min-h-screen px-4 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="btn-secondary py-2 px-4 text-sm">
            ← Back
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Live Gallery 🖼️</h1>
            <p className="text-white/50 text-sm">{photos.length} memories and counting</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Game link */}
          <Link href="/game" className="btn-primary py-2 px-4 text-sm">
            🎮 Play Game
          </Link>

          {/* Live badge */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
            <div className={`live-dot ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm font-medium text-white">
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-2xl font-bold text-white mb-2">No photos yet</h2>
          <p className="text-white/50 mb-6">Be the first to upload a memory!</p>
          <Link href="/upload" className="btn-primary">
            Upload Now 🚀
          </Link>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          <AnimatePresence>
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onClick={setSelected} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <LightboxModal photo={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <SessionGuard>
      <GalleryContent />
    </SessionGuard>
  );
}
