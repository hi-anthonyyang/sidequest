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
      <svg width="100%" height={400} style={{ minHeight: 400, display: 'block' }}>
        {/* Center coordinates for the root node */}
        {(() => {
          const width = 600; // SVG width
          const height = 400; // SVG height
          const cx = width / 2;
          const cy = height / 2;
          const r = 120; // radius for skill nodes
          const nodeCount = tree.root.children.length;
          // Calculate positions for skill nodes in a circle
          const skillPositions = tree.root.children.map((_: any, idx: number) => {
            const angle = (2 * Math.PI * idx) / nodeCount - Math.PI / 2; // start at top
            return {
              x: cx + r * Math.cos(angle),
              y: cy + r * Math.sin(angle),
            };
          });
          return (
            <g>
              {/* Root node ('You') */}
              <circle cx={cx} cy={cy} r={40} fill="#3867e3" />
              <text x={cx} y={cy + 7} textAnchor="middle" fill="#fff" fontSize={24} fontWeight="bold">You</text>
              {/* Add Skill '+' button */}
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => setShowModal(true)}
                tabIndex={0}
                aria-label="Add Skill"
              >
                {/* Overlay the plus button at the bottom right of the 'You' node */}
                <circle
                  cx={cx + 28}
                  cy={cy + 28}
                  r={12}
                  fill="#2563eb"
                  stroke="#fff"
                  strokeWidth={2}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))"
                />
                {/* Use the plus.svg icon */}
                <image
                  href="/icons/plus.svg"
                  x={cx + 28 - 8}
                  y={cy + 28 - 8}
                  width={16}
                  height={16}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                  filter="brightness(0) invert(1)"
                />
              </g>
              {/* Lines to children */}
              {skillPositions.map((pos: any, idx: number) => (
                <line
                  key={tree.root.children[idx].id + '-line'}
                  x1={cx}
                  y1={cy}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="#bbb"
                  strokeWidth={2}
                />
              ))}
              {/* Child skill nodes */}
              {tree.root.children.map((child: any, idx: number) => {
                const pos: any = skillPositions[idx];
                return (
                  <g key={child.id}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={32}
                      fill={child.proficient ? '#22c55e' : '#fff'}
                      stroke="#2563eb"
                      strokeWidth={3}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleProficient(idx)}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 7}
                      textAnchor="middle"
                      fill={child.proficient ? '#fff' : '#2563eb'}
                      fontSize={18}
                      fontWeight="bold"
                    >
                      {child.name.length > 14 ? child.name.slice(0, 12) + '…' : child.name}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="bg-white/60 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl p-8 w-full max-w-md pointer-events-auto transform transition-all duration-300"
            style={{
              animation: 'modalPopIn 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
            tabIndex={-1}
            onKeyDown={e => {
              if (e.key === 'Escape') setShowModal(false);
            }}
          >
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
              {skills.map(skill => {
                const alreadyAdded = tree.root.children.some((c: any) => c.id === skill.id);
                return (
                  <div
                    key={skill.id}
                    className={
                      'px-3 py-2 rounded flex items-center justify-between' +
                      (alreadyAdded
                        ? ' text-gray-400 bg-gray-50 cursor-not-allowed'
                        : ' text-gray-900 hover:bg-blue-100 cursor-pointer transition-colors')
                    }
                    onClick={() => !alreadyAdded && addSkill(skill)}
                    tabIndex={alreadyAdded ? -1 : 0}
                    style={{ outline: 'none' }}
                  >
                    <span>{skill.name}</span>
                    {alreadyAdded && (
                      <span className="ml-2 text-green-600 font-semibold flex items-center">
                        Added <span className="ml-1">✓</span>
                      </span>
                    )}
                  </div>
                );
              })}
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
          <style>{`
            @keyframes modalPopIn {
              0% { opacity: 0; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
} 