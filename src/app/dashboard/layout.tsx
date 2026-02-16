'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, PlusCircle, Target, User, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/growth', icon: BarChart3, label: 'Growth' },
  { href: '/dashboard/add', icon: PlusCircle, label: 'Add', isCenter: true },
  { href: '/dashboard/goals', icon: Target, label: 'Goals' },
  { href: '/dashboard/settings', icon: User, label: 'Profile' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#ECF0F1] flex-col">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#2ECC71] rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-[#2C3E50]">GrowBucks</span>
          </Link>
        </div>
        <nav className="flex-1 px-2 py-4">
          {navItems.filter(item => !item.isCenter).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors',
                  isActive
                    ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
                    : 'text-[#7F8C8D] hover:bg-[#ECF0F1] hover:text-[#2C3E50]'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="md:ml-64">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#ECF0F1] safe-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            if (item.isCenter) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -top-4"
                >
                  <div className="w-14 h-14 bg-[#2ECC71] rounded-full flex items-center justify-center shadow-lg shadow-[#2ECC71]/30">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-4',
                  isActive ? 'text-[#2ECC71]' : 'text-[#7F8C8D]'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
