"use client";

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

export type SkillStatus = 'goal' | 'achieved';
export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

interface Skill {
  id: string;
  name: string;
  status?: SkillStatus;
  proficiency?: SkillProficiency;
}

interface SkillNode {
  id: string;
  name: string;
  children: Skill[];
}

interface SkillTreeData {
  root: SkillNode;
}

interface SkillSearchResult {
  id: string;
  name: string;
}

const LOCAL_STORAGE_KEY = 'skillTree';

function loadTree(): SkillTreeData {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { root: { id: 'root', name: 'You', children: [] } };
}

function saveTree(tree: SkillTreeData) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tree));
}

export default function SkillTree() {
  const [tree, setTree] = useState<SkillTreeData>(loadTree());
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState<SkillSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [editingSkillIdx, setEditingSkillIdx] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<SkillStatus>('goal');
  const [editProficiency, setEditProficiency] = useState<SkillProficiency>('Beginner');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const controls = useAnimation();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragging = React.useRef(false);
  const lastPan = React.useRef({ x: 0, y: 0 });
  const dragStart = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fit tree when nodes change
  useEffect(() => {
    if (!mounted) return;
    const nodeCount = tree.root.children.length;
    if (nodeCount === 0) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Calculate bounding box of all nodes
    const width = 600;
    const height = 400;
    const r = 180;
    const cx = width / 2;
    const cy = height / 2;
    const skillPositions = tree.root.children.map((_: Skill, idx: number) => {
      const angle = (2 * Math.PI * idx) / nodeCount - Math.PI / 2;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    let minX = cx, maxX = cx, minY = cy, maxY = cy;
    skillPositions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });
    // Add some padding
    minX -= 80; maxX += 80; minY -= 60; maxY += 60;
    const treeW = maxX - minX;
    const treeH = maxY - minY;
    const scaleX = width / treeW;
    const scaleY = height / treeH;
    const fitScale = Math.min(scaleX, scaleY, 1);
    setScale(fitScale);
    // Center the tree
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setPan({ x: width / 2 - centerX, y: height / 2 - centerY });
  }, [tree.root.children.length, mounted]);

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

  function addSkill(skill: SkillSearchResult) {
    setTree((prev: SkillTreeData) => ({
      ...prev,
      root: {
        ...prev.root,
        children: [
          ...prev.root.children,
          { ...skill },
        ],
      },
    }));
    setShowModal(false);
    setSearch('');
    setSkills([]);
    setOffset(0);
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

  function openEditSkill(idx: number) {
    const skill = tree.root.children[idx];
    setEditingSkillIdx(idx);
    setEditStatus(skill.status || 'goal');
    setEditProficiency(skill.proficiency || 'Beginner');
    setShowModal(false);
  }

  function saveEditSkill() {
    if (editingSkillIdx === null) return;
    setTree(prev => {
      const children = [...prev.root.children];
      children[editingSkillIdx] = {
        ...children[editingSkillIdx],
        status: editStatus,
        proficiency: editStatus === 'achieved' ? editProficiency : undefined,
      };
      return { ...prev, root: { ...prev.root, children } };
    });
    setEditingSkillIdx(null);
  }

  function cancelEditSkill() {
    setEditingSkillIdx(null);
  }

  return (
    <div className="w-full flex flex-col items-center">
      {mounted && (
        <svg
          ref={svgRef}
          width="100%"
          height={400}
          style={{ minHeight: 400, display: 'block', touchAction: 'none', userSelect: 'none' }}
          onWheel={e => {
            e.preventDefault();
            let nextScale = scale * (e.deltaY < 0 ? 1.08 : 0.92);
            nextScale = Math.max(0.3, Math.min(2.5, nextScale));
            setScale(nextScale);
          }}
          onPointerDown={e => {
            dragging.current = true;
            lastPan.current = { ...pan };
            dragStart.current = { x: e.clientX, y: e.clientY };
            (e.target as SVGSVGElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (!dragging.current) return;
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPan({ x: lastPan.current.x + dx, y: lastPan.current.y + dy });
          }}
          onPointerUp={e => {
            dragging.current = false;
          }}
        >
          {(() => {
            const width = 600; // SVG width
            const height = 400; // SVG height
            const cx = width / 2;
            const cy = height / 2;
            const r = 180; // increased radius for skill nodes
            const nodeCount = tree.root.children.length;
            // Calculate positions for skill nodes in a circle
            const skillPositions = tree.root.children.map((_: Skill, idx: number) => {
              const angle = (2 * Math.PI * idx) / nodeCount - Math.PI / 2; // start at top
              return {
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle),
                angle,
              };
            });
            return (
              <motion.g
                animate={{
                  scale: scale,
                  x: pan.x,
                  y: pan.y,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                style={{ touchAction: 'none', cursor: dragging.current ? 'grabbing' : 'grab' }}
              >
                {/* Lines to children */}
                {skillPositions.map((pos: { x: number; y: number }, idx: number) => (
                  <line
                    key={tree.root.children[idx].id + '-line'}
                    x1={cx}
                    y1={cy}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={hoveredIdx === idx ? '#2563eb' : '#bbb'}
                    strokeWidth={hoveredIdx === idx ? 4 : 2}
                    style={
                      hoveredIdx === idx
                        ? {
                            transition: 'stroke-width 0.18s cubic-bezier(0.4,0,0.2,1), stroke 0.18s cubic-bezier(0.4,0,0.2,1)',
                          }
                        : { transition: 'stroke-width 0.18s cubic-bezier(0.4,0,0.2,1), stroke 0.18s cubic-bezier(0.4,0,0.2,1)' }
                    }
                  />
                ))}
                {tree.root.children.map((child: Skill, idx: number) => {
                  const pos = skillPositions[idx];
                  // Dynamic width for skill node based on text length
                  const text = child.name.length > 12 ? child.name.slice(0, 12) + '…' : child.name;
                  const textWidth = Math.max(90, text.length * 12 + 32); // +32 for padding
                  // Color logic
                  let fill = '#fff';
                  if (child.status === 'achieved') fill = '#2563eb';
                  else if (child.status === 'goal') fill = '#e0edff';
                  const isHovered = hoveredIdx === idx;
                  // Directional bounce: move outward along the angle
                  const bounceDistance = isHovered ? 18 : 0;
                  const tx = Math.cos(pos.angle) * bounceDistance;
                  const ty = Math.sin(pos.angle) * bounceDistance;
                  return (
                    <motion.g
                      key={child.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openEditSkill(idx)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      animate={{
                        x: tx,
                        y: ty,
                        scale: isHovered ? 1.08 : 1,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 18,
                      }}
                    >
                      <rect
                        x={pos.x - textWidth / 2}
                        y={pos.y - 26}
                        rx={32}
                        ry={32}
                        width={textWidth}
                        height={52}
                        fill={fill}
                        stroke="#2563eb"
                        strokeWidth={3}
                        style={{
                          filter: isHovered ? 'drop-shadow(0 0 12px #2563eb55)' : 'none',
                        }}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 7}
                        textAnchor="middle"
                        fill={child.status === 'achieved' ? '#fff' : '#2563eb'}
                        fontSize={18}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {text}
                      </text>
                    </motion.g>
                  );
                })}
                {/* Root node ('You') and Add Skill '+' button rendered last for top stacking */}
                <circle cx={cx} cy={cy} r={40} fill="#3867e3" />
                <text x={cx} y={cy + 7} textAnchor="middle" fill="#fff" fontSize={24} fontWeight="bold">You</text>
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
              </motion.g>
            );
          })()}
        </svg>
      )}
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
                const alreadyAdded = tree.root.children.some((c: Skill) => c.id === skill.id);
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
            @keyframes skillLinkPulse {
              0% { stroke-width: 2; }
              50% { stroke-width: 4; }
              100% { stroke-width: 2; }
            }
          `}</style>
        </div>
      )}
      {editingSkillIdx !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onClick={e => {
            if (e.target === e.currentTarget) cancelEditSkill();
          }}
        >
          <div
            className="bg-white/60 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl p-8 w-full max-w-md pointer-events-auto transform transition-all duration-300"
            style={{
              animation: 'modalPopIn 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
            tabIndex={-1}
            onKeyDown={e => {
              if (e.key === 'Escape') cancelEditSkill();
            }}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Edit Skill</h2>
            <div className="mb-4">
              <label className="block font-semibold mb-2 text-gray-800">Status</label>
              <div className="flex gap-4">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${editStatus === 'goal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                  onClick={() => setEditStatus('goal')}
                >
                  Set as a goal
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${editStatus === 'achieved' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                  onClick={() => setEditStatus('achieved')}
                >
                  Achieved
                </button>
              </div>
            </div>
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-gray-800">Proficiency</label>
              <div className="flex gap-2 flex-wrap">
                {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as SkillProficiency[]).map(level => (
                  <button
                    key={level}
                    className={`px-3 py-1 rounded-lg font-semibold border text-sm transition-colors ${editStatus !== 'achieved' ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : editProficiency === level ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                    onClick={() => editStatus === 'achieved' && setEditProficiency(level)}
                    disabled={editStatus !== 'achieved'}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 font-semibold"
                onClick={cancelEditSkill}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                onClick={saveEditSkill}
              >
                Save
              </button>
            </div>
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