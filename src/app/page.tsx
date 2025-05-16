'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { UniversityId } from '@/lib/types';

const universities: { id: UniversityId; name: string }[] = [
  { id: 'fresno_city_college', name: 'Fresno City College' },
  { id: 'fresno_state', name: 'Fresno State' },
  { id: 'reedley_college', name: 'Reedley College' }
];

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityId | ''>('');

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUniversity(e.target.value as UniversityId);
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

          {/* University Selection Dropdown centered, with speech bubble on left edge */}
          <div className="flex flex-col items-center mt-16 mb-8">
            <div className="relative w-full flex justify-center">
              <div className="realm-glow" style={{ width: 220 }}>
                <select
                  id="university"
                  value={selectedUniversity}
                  onChange={handleUniversityChange}
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#333333] text-base"
                >
                  <option value="" disabled>Select a university...</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
                {/* Speech bubble absolutely positioned to left edge, vertically centered */}
                <div className="speech-bubble absolute left-[-205px] top-1/2 transform -translate-y-1/2">
                  <span role="img" aria-label="castle">🏰</span> Choose the realm
                  <span className="bubble-tail" />
                </div>
              </div>
            </div>
            <style jsx>{`
              .realm-glow {
                position: relative;
                display: inline-block;
                animation: glow-pulse 2s infinite ease-in-out;
                border-radius: 0.5rem;
                box-shadow: 0 0 6px rgba(147, 112, 219, 0.4);
                transition: box-shadow 0.3s ease;
                max-width: 100%;
              }
              @keyframes glow-pulse {
                0% {
                  box-shadow: 0 0 6px rgba(147, 112, 219, 0.6);
                }
                50% {
                  box-shadow: 0 0 14px rgba(147, 112, 219, 1), 0 0 24px rgba(147, 112, 219, 0.5);
                }
                100% {
                  box-shadow: 0 0 6px rgba(147, 112, 219, 0.6);
                }
              }
              .speech-bubble {
                background: #fff;
                border-radius: 1rem;
                box-shadow: 0 2px 12px 0 rgba(80, 60, 180, 0.10);
                padding: 0.5rem 1.1rem;
                font-size: 1rem;
                font-weight: 500;
                color: #6d28d9;
                position: absolute;
                display: inline-block;
                z-index: 10;
                white-space: nowrap;
                min-width: 140px;
                max-width: 180px;
              }
              .bubble-tail {
                position: absolute;
                right: -10px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-top: 10px solid transparent;
                border-bottom: 10px solid transparent;
                border-left: 14px solid #fff;
                z-index: 11;
              }
              @media (max-width: 640px) {
                .realm-glow { width: 100%; min-width: 0; }
                .speech-bubble {
                  font-size: 0.95rem;
                  padding: 0.4rem 0.8rem;
                  min-width: 100px;
                  max-width: 60vw;
                  white-space: normal;
                }
                .bubble-tail {
                  right: -10px;
                }
              }
            `}</style>
          </div>

          <div className="mt-20 space-y-6">
            <Link 
              href={selectedUniversity ? `/questions?university=${selectedUniversity}` : "#"}
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
