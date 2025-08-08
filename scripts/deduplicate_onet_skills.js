#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Inputs (derived JSON produced from O*NET spreadsheets)
const INPUT_DIR = path.join(__dirname, '../src/data/onet/json');
const OUTPUT_DIR_PUBLIC = path.join(__dirname, '../public/data/onet/json');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR_PUBLIC, { recursive: true });

function readJson(fileName) {
  const filePath = path.join(INPUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing input JSON: ${filePath}. Run onet:convert first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Load inputs
const skillsData = readJson('Skills_Skills.json');
const occData = readJson('Occupation Data_Occupation_Data.json');

// 1. Build unique skills dictionary
const uniqueSkills = {};
for (const row of skillsData) {
  const id = row['Element ID'];
  if (!uniqueSkills[id]) {
    uniqueSkills[id] = {
      id,
      name: row['Element Name'],
      description: row['Element Description']
    };
  }
}

// 2. Build occupation -> skills mapping with ratings
const occupationSkills = {};
for (const occ of occData) {
  const code = occ['O*NET-SOC Code'];
  occupationSkills[code] = {};
}

// First pass: Collect all ratings
for (const row of skillsData) {
  const code = row['O*NET-SOC Code'];
  const id = row['Element ID'];
  const scaleName = row['Scale Name'];
  const value = Number(row['Data Value']);

  if (!occupationSkills[code]) continue;
  if (!occupationSkills[code][id]) {
    occupationSkills[code][id] = {
      importance: 0,
      level: 0
    };
  }

  if (scaleName === 'Importance') {
    occupationSkills[code][id].importance = value;
  } else if (scaleName === 'Level') {
    occupationSkills[code][id].level = value;
  }
}

// Second pass: Filter to top skills per occupation
const TOP_SKILLS_PER_OCCUPATION = Number(process.env.TOP_SKILLS_PER_OCCUPATION || 10);
for (const code of Object.keys(occupationSkills)) {
  const skills = occupationSkills[code];
  
  // Convert to array and sort by importance, then level
  const skillsArray = Object.entries(skills)
    .map(([id, ratings]) => ({
      id,
      ...ratings
    }))
    .sort((a, b) => {
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      return b.level - a.level;
    });

  // Keep only top N skills
  occupationSkills[code] = skillsArray
    .slice(0, TOP_SKILLS_PER_OCCUPATION)
    .reduce((acc, skill) => {
      acc[skill.id] = {
        importance: skill.importance,
        level: skill.level
      };
      return acc;
    }, {});
}

// Write outputs for app consumption (public)
fs.writeFileSync(
  path.join(OUTPUT_DIR_PUBLIC, 'unique_skills.json'),
  JSON.stringify(uniqueSkills, null, 2)
);
fs.writeFileSync(
  path.join(OUTPUT_DIR_PUBLIC, 'occupation_skills.json'),
  JSON.stringify(occupationSkills, null, 2)
);

console.log('[ONET] Wrote public data: unique_skills.json, occupation_skills.json');