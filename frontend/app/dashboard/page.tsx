'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SessionGuard, { useSession } from '@/components/SessionGuard';
import { getPhotos } from '@/lib/api';
import { clearSession } from '@/lib/session';

const features = [
  {
    href: '/upload',
    icon: '📸',
    title: 'Upload Photos & Videos',
    description: 'Share your captured moments with everyone',
    gradient: 'from-purple-500/30 to-pink-500/30',
    border: 'border-purple-400/30',
    hoverBorder: 'hover:border-purple-400/70',
  },
  {
    href: '/gallery',
    icon: '🖼️',
    title: 'Live Gallery',
    description: 'See all memories appear in real-time',
    gradient: 'from-pink-500/30 to-rose-500/30',
    border: 'border-pink-400/30',
    hoverBorder: 'hover:border-pink-400/70',
  },
  {
    href: '/slideshow',
    icon: '▶️',
    title: 'Slideshow',
    description: 'Watch a beautiful auto-playing slideshow',
    gradient: 'from-blue-500/30 to-cyan-500/30',
    border: 'border-blue-400/30',
    hoverBorder: 'hover:border-blue-400/70',
  },
  {
    href: '/countdown',
    icon: '⏰',
    title: 'Countdown',
    description: "Time until the big day!",
    gradient: 'from-yellow-500/30 to-orange-500/30',
    border: 'border-yellow-400/30',
    hoverBorder: 'hover:border-yellow-400/70',
  },
  {
    href: '/mosaic',
    icon: '🧩',
    title: 'Photo Mosaic',
    description: "See everyone's photos as a memory wall",
    gradient: 'from-green-500/30 to-teal-500/30',
    border: 'border-green-400/30',
    hoverBorder: 'hover:border-green-400/70',
  },
  {
    href: '/qr',
    icon: '📲',
    title: 'QR Code',
    description: 'Share the event link with others',
    gradient: 'from-indigo-500/30 to-violet-500/30',
    border: 'border-indigo-400/30',
    hoverBorder: 'hover:border-indigo-400/70',
  },
];

function DashboardContent() {
  const session = useSession();
  const router = useRouter();
  const [photoCount, setPhotoCount] = useState<number | null>(null);

  useEffect(() => {
    getPhotos()
      .then((photos) => setPhotoCount(photos.length))
      .catch(() => setPhotoCount(null));
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-white/50 text-sm uppercase tracking-widest mb-1">You&apos;re in!</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            Hey {session.firstName}! 🥳
          </h1>
          <p className="text-white/60 mt-2 text-base">
            Pick something to do below and help make this celebration unforgettable.
          </p>
        </div>

        {/* Photo count badge + sign out */}
        <div className="flex flex-col items-end gap-3">
          {photoCount !== null && (
            <div className="bg-purple-500/20 border border-purple-400/30 rounded-full px-4 py-1.5 text-sm font-semibold text-purple-200">
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'} 🎞️
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <div
              className={`
                card card-hover h-full cursor-pointer
                bg-gradient-to-br ${feature.gradient}
                border ${feature.border} ${feature.hoverBorder}
              `}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h2 className="text-lg font-bold text-white mb-2">{feature.title}</h2>
              <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              <div className="mt-4 text-purple-300 text-sm font-semibold flex items-center gap-1">
                Open <span className="text-base">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-white/20 text-xs mt-12">
        Logged in as {session.firstName} {session.lastName}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionGuard>
      <DashboardContent />
    </SessionGuard>
  );
}
