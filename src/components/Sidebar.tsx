"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// NavPanel: Trivial change to force redeploy
export default function Sidebar() {
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
      <div className={`flex flex-col ${collapsed ? 'items-center' : 'items-end'} mb-8`}>
        <button
          className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-0 focus-visible:outline-none z-10"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Open navigation panel' : 'Close navigation panel'}
          style={{ position: 'static' }}
        >
          <Image
            src={collapsed ? "/icons/panel-left-open.svg" : "/icons/panel-left-close.svg"}
            alt={collapsed ? "Open" : "Close"}
            width={28}
            height={28}
            className="w-7 h-7"
          />
        </button>
      </div>
      <div className="space-y-2 mt-4">
        {/* Quests (active) */}
        <Link 
          href="/quests"
          className={`flex items-center gap-4 px-4 py-3 text-gray-800 text-lg ${pathname === '/quests' ? 'font-bold' : 'font-normal'} hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Image src="/icons/backpack.svg" alt="Quests" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0" />
          {showText && !collapsed && 'Quests'}
        </Link>
        {/* Calendar (disabled) */}
        <div
          role="link"
          aria-disabled
          tabIndex={-1}
          className={`flex items-center gap-4 px-4 py-3 text-gray-400 text-lg rounded-lg ${collapsed ? 'justify-center' : ''} cursor-not-allowed select-none opacity-60`}
        >
          <Image src="/icons/calendar-days.svg" alt="Calendar (coming soon)" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0 opacity-30 grayscale" />
          {showText && !collapsed && 'Calendar'}
        </div>
        {/* Assignments (disabled) */}
        <div
          role="link"
          aria-disabled
          tabIndex={-1}
          className={`flex items-center gap-4 px-4 py-3 text-gray-400 text-lg rounded-lg ${collapsed ? 'justify-center' : ''} cursor-not-allowed select-none opacity-60`}
        >
          <Image src="/icons/scroll-text.svg" alt="Assignments (coming soon)" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0 opacity-30 grayscale" />
          {showText && !collapsed && 'Assignments'}
        </div>
        {/* Skill Tree (disabled like Calendar/Assignments) */}
        <div
          role="link"
          aria-disabled
          tabIndex={-1}
          className={`flex items-center gap-4 px-4 py-3 text-gray-400 text-lg rounded-lg ${collapsed ? 'justify-center' : ''} cursor-not-allowed select-none opacity-60`}
        >
          <Image src="/icons/folder-tree.svg" alt="Skill Tree (coming soon)" width={28} height={28} className="w-7 h-7 min-w-[28px] min-h-[28px] flex-shrink-0 opacity-30 grayscale" />
          {showText && !collapsed && 'Skill Tree'}
        </div>
      </div>
    </nav>
  );
} 