"use client";
import React, { useState, useEffect, useMemo } from "react";

interface Skill {
  id: string;
  name: string;
  importance: number;
  level: number;
}

interface Occupation {
  code: string;
  title: string;
  description: string;
}

export default function SkillRadialTree() {
  const [occupationSkills, setOccupationSkills] = useState<any>(null);
  const [uniqueSkills, setUniqueSkills] = useState<any>(null);
  const [occupationData, setOccupationData] = useState<any>(null);
  const [selectedOcc, setSelectedOcc] = useState<string>("");

  useEffect(() => {
    fetch("/data/onet/json/occupation_skills.json").then(res => res.json()).then(setOccupationSkills);
    fetch("/data/onet/json/unique_skills.json").then(res => res.json()).then(setUniqueSkills);
    fetch("/data/onet/json/Occupation Data_Occupation_Data.json").then(res => res.json()).then(setOccupationData);
  }, []);

  // Build a lookup for occupation code to occupation
  const occupationMap: Record<string, Occupation> = {};
  if (occupationData) {
    (occupationData as any[]).forEach((occ) => {
      occupationMap[occ["O*NET-SOC Code"]] = {
        code: occ["O*NET-SOC Code"],
        title: occ["Title"],
        description: occ["Description"],
      };
    });
  }

  const occupationOptions = Object.values(occupationMap).map((occ) => ({
    value: occ.code,
    label: occ.title,
  }));

  // Set default selected occupation after data loads
  useEffect(() => {
    if (!selectedOcc && occupationOptions.length > 0) {
      setSelectedOcc(occupationOptions[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupationOptions.length]);

  function getSkillsForOccupation(code: string): Skill[] {
    if (!occupationSkills || !uniqueSkills) return [];
    const skillsObj = (occupationSkills as any)[code] || {};
    return Object.entries(skillsObj).map(([skillId, val]: any) => ({
      id: skillId,
      name: (uniqueSkills as any)[skillId]?.name || skillId,
      importance: val.importance,
      level: val.level,
    }));
  }

  function getSkillIdsForOccupation(code: string): Set<string> {
    if (!occupationSkills) return new Set();
    return new Set(Object.keys((occupationSkills as any)[code] || {}));
  }

  const skills = selectedOcc ? getSkillsForOccupation(selectedOcc) : [];
  const occ = selectedOcc ? occupationMap[selectedOcc] : null;

  // Compute related occupations (top 3 by overlapping skills)
  const relatedOccupations = useMemo(() => {
    if (!selectedOcc || !occupationSkills) return [];
    const selectedSkillIds = getSkillIdsForOccupation(selectedOcc);
    return occupationOptions
      .filter(opt => opt.value !== selectedOcc)
      .map(opt => {
        const otherSkillIds = getSkillIdsForOccupation(opt.value);
        const shared = [...selectedSkillIds].filter(id => otherSkillIds.has(id));
        return {
          code: opt.value,
          title: occupationMap[opt.value]?.title,
          sharedCount: shared.length,
        };
      })
      .filter(o => o.sharedCount > 0)
      .sort((a, b) => b.sharedCount - a.sharedCount)
      .slice(0, 3);
  }, [selectedOcc, occupationSkills]);

  // Radial layout
  const width = 600;
  const height = 600;
  const center = { x: width / 2, y: height / 2 };
  const radius = 200;
  const nodeRadius = 40;

  // Loading state (after all hooks)
  const isLoading = !occupationSkills || !uniqueSkills || !occupationData;
  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="w-full flex flex-col md:flex-row md:items-start gap-8 items-center">
      <div className="flex-1 flex flex-col items-center">
        <label className="mb-2 font-semibold text-gray-800">Select Occupation:</label>
        <select
          className="mb-6 p-2 border border-gray-300 rounded bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-200"
          value={selectedOcc}
          onChange={e => setSelectedOcc(e.target.value)}
        >
          {occupationOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="mb-4 text-center bg-white/80 border border-gray-200 rounded-lg p-4 shadow-sm max-w-xl">
          <h2 className="text-2xl font-bold text-gray-900">{occ?.title}</h2>
          <p className="text-gray-700 text-base mt-2">{occ?.description}</p>
        </div>
        <svg width={width} height={height}>
          {/* Center node */}
          <circle cx={center.x} cy={center.y} r={nodeRadius} fill="#2563eb" />
          <text
            x={center.x}
            y={center.y}
            textAnchor="middle"
            dy=".3em"
            fill="#fff"
            fontWeight="bold"
            fontSize={18}
            style={{ textShadow: "0 1px 4px #0008" }}
          >
            {occ?.title?.split(' ')[0] || 'Occupation'}
          </text>
          {/* Skill nodes */}
          {skills.map((skill, i) => {
            const angle = (2 * Math.PI * i) / skills.length - Math.PI / 2;
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);
            return (
              <g key={skill.id}>
                <line x1={center.x} y1={center.y} x2={x} y2={y} stroke="#cbd5e1" strokeWidth={2} />
                <circle cx={x} cy={y} r={nodeRadius * 0.7} fill="#3b82f6" />
                <title>{skill.name}\nImportance: {skill.importance}\nLevel: {skill.level}</title>
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dy=".3em"
                  fill="#fff"
                  fontSize={14}
                  fontWeight="bold"
                  style={{ textShadow: "0 1px 4px #0008" }}
                >
                  {skill.name.length > 16 ? skill.name.slice(0, 14) + '…' : skill.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow p-4 mt-8 md:mt-0">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 text-center md:text-left">Related Occupations</h3>
        {relatedOccupations.length === 0 && (
          <div className="text-gray-500 text-sm text-center">No closely related occupations found.</div>
        )}
        <ul className="divide-y divide-gray-200">
          {relatedOccupations.map((rel) => (
            <li
              key={rel.code}
              className="flex flex-col md:flex-row md:items-center md:justify-between py-2 group"
            >
              <span className="font-medium text-gray-800">{rel.title}</span>
              <span className="text-xs text-gray-500">Shared skills: {rel.sharedCount}</span>
              <button
                className="mt-1 md:mt-0 md:ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 hover:shadow transition"
                onClick={() => setSelectedOcc(rel.code)}
              >
                View
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 