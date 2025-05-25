"use client";

import React, { useEffect, useState } from 'react';

const LOCAL_STORAGE_KEY = 'skillTree';

function loadTree() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { root: { id: 'root', name: 'You', children: [] } };
}

function saveTree(tree: any) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tree));
}

export default function SkillTree() {
  const [tree, setTree] = useState<any>(loadTree());
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    saveTree(tree);
  }, [tree]);

  useEffect(() => {
    if (search.length < 3) {
      setSkills([]);
      setHasMore(false);
      setOffset(0);
      return;
    }
    setLoading(true);
    fetch(`/api/skills/search?q=${encodeURIComponent(search)}&offset=0`)
      .then(res => res.json())
      .then(data => {
        setSkills(data.results);
        setHasMore(data.hasMore);
        setOffset(5);
      })
      .finally(() => setLoading(false));
  }, [search]);

  function addSkill(skill: { id: string; name: string }) {
    setTree((prev: any) => ({
      ...prev,
      root: {
        ...prev.root,
        children: [
          ...prev.root.children,
          { ...skill, proficient: false },
        ],
      },
    }));
    setShowModal(false);
    setSearch('');
    setSkills([]);
    setOffset(0);
  }

  function toggleProficient(idx: number) {
    setTree((prev: any) => {
      const children = [...prev.root.children];
      children[idx] = { ...children[idx], proficient: !children[idx].proficient };
      return { ...prev, root: { ...prev.root, children } };
    });
  }

  function showMore() {
    setLoading(true);
    fetch(`/api/skills/search?q=${encodeURIComponent(search)}&offset=${offset}`)
      .then(res => res.json())
      .then(data => {
        setSkills(prev => [...prev, ...data.results]);
        setHasMore(data.hasMore);
        setOffset(offset + 5);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="w-full flex flex-col items-center">
      <svg width="100%" height={120 + 60 * (tree.root.children.length || 1)} style={{ minHeight: 200 }}>
        {/* Root node */}
        <circle cx={300} cy={60} r={32} fill="#2563eb" />
        <text x={300} y={65} textAnchor="middle" fill="#fff" fontSize={18} fontWeight="bold">You</text>
        {/* Lines to children */}
        {tree.root.children.map((child: any, idx: number) => (
          <line
            key={child.id}
            x1={300}
            y1={92}
            x2={120 + idx * 120}
            y2={160}
            stroke="#bbb"
            strokeWidth={2}
          />
        ))}
        {/* Child skill nodes */}
        {tree.root.children.map((child: any, idx: number) => (
          <g key={child.id}>
            <circle
              cx={120 + idx * 120}
              cy={160}
              r={28}
              fill={child.proficient ? '#22c55e' : '#fff'}
              stroke="#2563eb"
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleProficient(idx)}
            />
            <text
              x={120 + idx * 120}
              y={165}
              textAnchor="middle"
              fill={child.proficient ? '#fff' : '#2563eb'}
              fontSize={13}
              fontWeight="bold"
            >
              {child.name.length > 14 ? child.name.slice(0, 12) + '…' : child.name}
            </text>
          </g>
        ))}
      </svg>
      <button
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        onClick={() => setShowModal(true)}
      >
        + Add Skill
      </button>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/60 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl p-8 w-full max-w-md pointer-events-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Add a Skill</h2>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-gray-900 placeholder-gray-400 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto mb-6">
              {loading && <div className="text-gray-500">Searching…</div>}
              {!loading && skills.length === 0 && search.length >= 3 && <div className="text-gray-500">No skills found.</div>}
              {skills.map(skill => (
                <div
                  key={skill.id}
                  className="px-3 py-2 rounded cursor-pointer text-gray-900 hover:bg-blue-100 transition-colors"
                  onClick={() => addSkill(skill)}
                  tabIndex={0}
                  style={{ outline: 'none' }}
                >
                  {skill.name}
                </div>
              ))}
              {hasMore && !loading && (
                <button
                  className="w-full mt-2 px-3 py-2 bg-white/70 hover:bg-blue-50 rounded text-blue-600 font-semibold border border-blue-100"
                  onClick={showMore}
                >
                  Show more
                </button>
              )}
            </div>
            <button
              className="mt-2 px-4 py-2 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 mr-2 font-semibold"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 