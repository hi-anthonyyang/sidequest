'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { UniversityId } from '@/lib/types';

const universities: { id: UniversityId; name: string }[] = [
  { id: 'fresno_state', name: 'Fresno State' },
  { id: 'reedley_college', name: 'Reedley College' }
];

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityId | ''>('');

  useEffect(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem('selectedUniversity');
    if (stored) setSelectedUniversity(stored as UniversityId);
  }, []);

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUniversity(e.target.value as UniversityId);
    localStorage.setItem('selectedUniversity', e.target.value);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3">
                <Image
                  src="/icons/sidequest_logo.svg"
                  alt="Sidequest Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <p className="text-sm font-medium text-blue-600 tracking-[0.2em] uppercase">
                  Sidequest
                </p>
              </div>
              <h1 className="text-4xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                Discover Your Main and Side Quests
              </h1>
            </div>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-snug tracking-wide">
              Explore majors, careers, and opportunities that align with your interests and goals.
            </p>
          </div>

          {/* University Selection Dropdown */}
          <div className="max-w-xs mx-auto mt-16 mb-8">
            <label htmlFor="university" className="block text-base font-medium text-gray-700 mb-2 text-left">
              <span role="img" aria-label="castle">🏰</span> Choose the realm
            </label>
            <select
              id="university"
              value={selectedUniversity}
              onChange={handleUniversityChange}
              className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#333333]"
            >
              <option value="" disabled>Select a university…</option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-20 space-y-6">
            <Link 
              href={selectedUniversity ? "/questions" : "#"}
              className={`inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-medium tracking-wide hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 ${!selectedUniversity ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              tabIndex={!selectedUniversity ? -1 : 0}
              aria-disabled={!selectedUniversity}
            >
              <Image
                src="/icons/wand-sparkles.svg"
                alt="Wand Sparkles"
                width={20}
                height={20}
                className="w-5 h-5 brightness-0 invert"
              />
              Begin My Quests
            </Link>
            <p className="text-xs text-gray-400 font-mono tracking-wide">
              6 questions, 6 minutes or less, get your IRL quests.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
