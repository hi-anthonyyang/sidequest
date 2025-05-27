import React from 'react';
import SkillTree from './SkillTree';
import SkillRadialTree from './SkillRadialTree';

export default function SkillTreePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans">
      <div className="container mx-auto px-4 pt-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4 text-center">
                Skill Tree
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto text-center">
                Explore and track your real-life skills and career paths in a gamified skill tree.
              </p>
              <SkillRadialTree />
              <div className="my-12 border-t border-gray-200" />
              <SkillTree />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 