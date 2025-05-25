import React from 'react';

export default function SkillTreePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans">
      <div className="container mx-auto px-4 pt-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4">
            Skill Tree
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl">
            Visualize and plan your personal and career development paths like an MMO skill tree. Explore interconnected skills, set goals, and discover real-world learning paths and careers.
          </p>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 min-h-[400px] flex items-center justify-center">
            {/* Skill Tree Visualization Placeholder */}
            <span className="text-gray-400 text-xl">[Skill Tree Visualization Coming Soon]</span>
          </div>
        </div>
      </div>
    </main>
  );
} 