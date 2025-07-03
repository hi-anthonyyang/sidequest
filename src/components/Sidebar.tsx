"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// NavPanel: Trivial change to force redeploy
export default function Sidebar() {
  console.log('Sidebar rendered');
  const [collapsed, setCollapsed] = useState(false);
  const [showText, setShowText] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!collapsed) {
      // Delay showing text until panel is nearly open
      const timeout = setTimeout(() => setShowText(true), 180);
      return () => clearTimeout(timeout);
    } else {
      setShowText(false);
    }
  }, [collapsed]);

  return (
    <nav className={`relative bg-white border-r border-gray-200 p-4 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`} style={{ minWidth: collapsed ? '5rem' : '16rem' }}>
      <div className="flex flex-col items-end mb-8">
        <button
          className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Open navigation panel' : 'Close navigation panel'}
          style={{ position: 'static' }}
        >
          <Image
            src={collapsed ? "/icons/panel-left-open.svg" : "/icons/panel-left-close.svg"}
            alt={collapsed ? "Open" : "Close"}
            width={20}
            height={20}
            className="w-5 h-5"
          />
        </button>
      </div>
      <div className="space-y-2 mt-4">
        <Link 
          href="/"
          className={`flex items-center gap-4 px-4 py-3 text-gray-800 text-lg ${pathname === '/' ? 'font-bold' : 'font-normal'} hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Image src="/icons/calendar-days.svg" alt="Calendar" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0" />
          {showText && !collapsed && 'Calendar'}
        </Link>
        <Link 
          href="/quests"
          className={`flex items-center gap-4 px-4 py-3 text-gray-800 text-lg ${pathname === '/quests' ? 'font-bold' : 'font-normal'} hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Image src="/icons/backpack.svg" alt="Quests" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0" />
          {showText && !collapsed && 'Quests'}
        </Link>
        <Link 
          href="/assignments"
          className={`flex items-center gap-4 px-4 py-3 text-gray-800 text-lg ${pathname === '/assignments' ? 'font-bold' : 'font-normal'} hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Image src="/icons/scroll-text.svg" alt="Assignments" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0" />
          {showText && !collapsed && 'Assignments'}
        </Link>
        {/* Temporarily hidden Skill Tree navigation
        <Link
          href="/skill-tree"
          className={`flex items-center gap-4 px-4 py-3 text-gray-800 text-lg ${pathname === '/skill-tree' ? 'font-bold' : 'font-normal'} hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Image src="/icons/sword.svg" alt="Skill Tree" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0" />
          {showText && !collapsed && 'Skill Tree'}
        </Link>
        */}
      </div>
    </nav>
  );
} 