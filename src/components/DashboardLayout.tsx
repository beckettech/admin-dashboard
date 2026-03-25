'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: '📊' },
  { href: '/prospects', label: 'Prospects', icon: '📞' },
  { href: '/leads', label: 'Demos', icon: '🎯' },
  { href: '/templates', label: 'Email', icon: '📧' },

];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Minimal header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg">FastFlow</span>
          </Link>
          
          <button 
            onClick={handleLogout}
            className="text-slate-400 text-sm px-3 py-2 active:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-sm border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                pathname === item.href
                  ? 'text-blue-400'
                  : 'text-slate-500 active:text-white'
              }`}
            >
              <span className="text-2xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-16 h-full text-slate-500 active:text-red-400 transition-colors"
          >
            <span className="text-2xl mb-0.5">🚪</span>
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
