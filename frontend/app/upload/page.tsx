'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import SessionGuard, { useSession } from '@/components/SessionGuard';
import { uploadMedia } from '@/lib/api';

interface FileItem {
  file: File;
  id: string;
  preview: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fireConfetti() {
  import('canvas-confetti').then((confettiModule) => {
    const confetti = confettiModule.default;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } }), 400);
  });
}

function UploadContent() {
  const session = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newItems]);
    setAllDone(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 5,
    maxSize: 100 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setUploading(true);

    await Promise.all(
      pending.map(async (item) => {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
        );
        try {
          await uploadMedia(
            item.file,
            session.firstName,
            session.lastName,
            (pct) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
              );
            }
          );
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: 'done', progress: 100 } : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: 'error', error: msg } : f
            )
          );
        }
      })
    );

    setUploading(false);
    const allSuccess = files.every((f) => f.status === 'done' || f.status === 'error');
    if (allSuccess) {
      setAllDone(true);
      fireConfetti();
      setTimeout(() => router.push('/success'), 1200);
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      {/* Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="btn-secondary py-2 px-4 text-sm">
          ← Back
        </Link>
        <p className="text-white/50 text-sm">
          Uploading as <span className="text-white font-semibold">{session.firstName} {session.lastName}</span>
        </p>
      </div>

      <h1 className="text-3xl font-extrabold text-white mb-2">Upload 📸</h1>
      <p className="text-white/60 mb-8">Share your photos and videos with everyone at the party.</p>

      {/* Uploading redirect state */}
      {allDone && (
        <div className="card border-green-400/40 bg-green-500/10 text-center mb-6">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-green-300 mb-1">Uploads complete!</h2>
          <p className="text-white/60 text-sm">Taking you to the success page...</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-purple-400 bg-purple-500/20 scale-[1.01]'
            : 'border-white/30 bg-white/5 hover:border-purple-400/60 hover:bg-white/10'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">{isDragActive ? '✨' : '📷'}</div>
        <p className="text-white font-semibold text-lg mb-1">
          {isDragActive ? 'Drop your files here!' : 'Drop photos & videos here'}
        </p>
        <p className="text-white/50 text-sm mb-3">or click to browse your device</p>
        <p className="text-white/30 text-xs">Accepts images & videos • Max 100 MB per file • Up to 5 at a time</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {files.map((item) => (
            <div key={item.id} className="card flex items-center gap-4 p-4">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🎥</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{item.file.name}</p>
                <p className="text-white/40 text-xs">{formatBytes(item.file.size)}</p>

                {item.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="progress-bar h-full rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-white/40 text-xs mt-1">{item.progress}%</p>
                  </div>
                )}

                {item.status === 'done' && (
                  <p className="text-green-400 text-xs mt-1 font-medium">✓ Uploaded</p>
                )}

                {item.status === 'error' && (
                  <p className="text-pink-400 text-xs mt-1">✗ {item.error}</p>
                )}
              </div>

              {/* Remove button */}
              {item.status === 'pending' && (
                <button
                  onClick={() => removeFile(item.id)}
                  className="text-white/30 hover:text-white/70 transition-colors text-lg flex-shrink-0"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              )}

              {item.status === 'done' && (
                <span className="text-green-400 text-xl flex-shrink-0">✓</span>
              )}
            </div>
          ))}

          {/* Upload all button */}
          {pendingCount > 0 && (
            <button
              onClick={uploadAll}
              disabled={uploading}
              className="btn-primary w-full mt-2 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Uploading...
                </span>
              ) : (
                `Upload ${pendingCount} ${pendingCount === 1 ? 'File' : 'Files'} 🚀`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <SessionGuard>
      <UploadContent />
    </SessionGuard>
  );
}
