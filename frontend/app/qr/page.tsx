'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

const BIRTHDAY_NAME = process.env.NEXT_PUBLIC_BIRTHDAY_NAME || 'the Birthday Star';

export default function QRPage() {
  const [url, setUrl] = useState('');
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  const handleDownload = () => {
    if (!qrContainerRef.current) return;
    const svgEl = qrContainerRef.current.querySelector('svg');
    if (!svgEl) return;

    // Serialize SVG and convert to canvas for PNG download
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const SIZE = 600;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.fillStyle = '#1e0a3c';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 50, 50, SIZE - 100, SIZE - 100);
      const a = document.createElement('a');
      a.download = `birthday-qr-${BIRTHDAY_NAME.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link href="/dashboard" className="btn-secondary py-2 px-4 text-sm">
          ← Back
        </Link>
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📲</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Share the Party!
          </h1>
          <p className="text-white/60">
            Let guests scan to join <span className="gradient-text font-bold">{BIRTHDAY_NAME}&apos;s</span> celebration
          </p>
        </div>

        {/* QR Card */}
        <div className="card text-center">
          {/* QR Code */}
          <div
            ref={qrContainerRef}
            className="flex items-center justify-center mb-6 p-6 bg-white rounded-2xl mx-auto"
            style={{ width: 'fit-content' }}
          >
            {url ? (
              <QRCodeSVG
                value={url}
                size={280}
                bgColor="#ffffff"
                fgColor="#1e0a3c"
                level="H"
                includeMargin={false}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            Scan to join <span className="gradient-text">{BIRTHDAY_NAME}&apos;s</span>
          </h2>
          <p className="text-white font-semibold text-lg mb-4">Birthday Celebration! 🎉</p>

          {/* URL display */}
          {url && (
            <div className="bg-white/10 rounded-xl px-4 py-2 mb-6 break-all">
              <p className="text-white/70 text-sm font-mono">{url}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="text-left bg-white/5 rounded-xl p-4 mb-6 space-y-2">
            <p className="text-white/80 text-sm font-semibold mb-3">How it works:</p>
            {[
              '📱 Scan the QR code with your phone',
              '✏️ Enter your first & last name',
              '📸 Upload your photos & videos!',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/50 border border-purple-400/50 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-white/70 text-sm">{step}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
              <span>⬇️</span> Download PNG
            </button>
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
              <span>🖨️</span> Print
            </button>
          </div>
        </div>

        {/* Print-only styles */}
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .card, .card * { visibility: visible; }
            .card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
            .btn-primary, .btn-secondary { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
