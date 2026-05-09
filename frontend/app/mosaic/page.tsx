'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import SessionGuard from '@/components/SessionGuard';
import { getPhotos, Photo } from '@/lib/api';
import { getSocket } from '@/lib/socket';

function PlaceholderCell({ index }: { index: number }) {
  return (
    <div
      className="aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <span className="text-2xl opacity-30 select-none">✨</span>
    </div>
  );
}

function MosaicCell({ photo }: { photo: Photo }) {
  const src = photo.thumbnail_url || photo.cloudinary_url;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
    >
      <Image
        src={src}
        alt={`${photo.guest_first_name} ${photo.guest_last_name}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-110"
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 150px"
        unoptimized
      />

      {/* Video indicator */}
      {photo.resource_type === 'video' && (
        <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-xs">
          ▶
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
        <p className="text-white text-xs font-semibold leading-tight truncate">
          {photo.guest_first_name} {photo.guest_last_name[0]}.
        </p>
      </div>
    </motion.div>
  );
}

function MosaicContent() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

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

  // Fill up with placeholders if fewer than 20 photos
  const targetCells = Math.max(photos.length, 20);
  const placeholderCount = targetCells - photos.length;

  return (
    <div className="min-h-screen px-4 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="btn-secondary py-2 px-4 text-sm">
            ← Back
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white">The Memory Wall 🧩</h1>
            <p className="text-white/50 text-sm">
              {photos.length} {photos.length === 1 ? 'memory' : 'memories'} and growing
            </p>
          </div>
        </div>

        {/* Live badge */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
          <div className={`live-dot ${connected ? 'bg-green-400' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-white">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Mosaic grid */}
          <div className="mosaic-grid">
            <AnimatePresence>
              {photos.map((photo) => (
                <MosaicCell key={photo.id} photo={photo} />
              ))}
            </AnimatePresence>

            {/* Placeholder cells */}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <PlaceholderCell key={`placeholder-${i}`} index={i} />
            ))}
          </div>

          {photos.length === 0 && (
            <div className="text-center mt-12">
              <p className="text-white/50 mb-4">
                No photos yet. Upload some to start the mosaic!
              </p>
              <Link href="/upload" className="btn-primary">
                Be the First to Upload 📸
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MosaicPage() {
  return (
    <SessionGuard>
      <MosaicContent />
    </SessionGuard>
  );
}
