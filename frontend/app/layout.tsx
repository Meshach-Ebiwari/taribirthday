import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Tari's 1st Birthday 🎂",
  description: "Celebrate Tari Ayomiposi Ebiwari's 1st birthday — upload photos, watch the slideshow, and share the memories!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen relative overflow-x-hidden">
        {/* Floating decorative background elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Large blurred orbs */}
          <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-purple-600/20 blur-3xl animate-float" />
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 rounded-full bg-pink-500/20 blur-3xl animate-float-delay" />
          <div className="absolute bottom-[-5%] left-[20%] w-72 h-72 rounded-full bg-birthday-purple/20 blur-3xl animate-float-delay-2" />
          <div className="absolute top-[60%] right-[10%] w-64 h-64 rounded-full bg-birthday-pink/15 blur-3xl animate-float" />
          <div className="absolute top-[40%] left-[-8%] w-56 h-56 rounded-full bg-purple-400/10 blur-2xl animate-float-delay" />
        </div>

        {/* Page content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
