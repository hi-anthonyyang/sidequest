const fs = require('fs');
const path = require('path');

// Load O*NET skills data
const skillsPath = path.join(__dirname, '../src/data/onet/json/Skills_Skills.json');
const skillsRaw = fs.readFileSync(skillsPath, 'utf-8');
const skillsData = JSON.parse(skillsRaw);

// Load O*NET occupation data
const occPath = path.join(__dirname, '../src/data/onet/json/Occupation Data_Occupation_Data.json');
const occRaw = fs.readFileSync(occPath, 'utf-8');
const occData = JSON.parse(occRaw);

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
const TOP_SKILLS_PER_OCCUPATION = 10; // Adjust this number as needed
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

// Write unique skills to file
fs.writeFileSync(
  path.join(__dirname, '../src/data/onet/json/unique_skills.json'),
  JSON.stringify(uniqueSkills, null, 2)
);

// Write occupation-skills mapping to file
fs.writeFileSync(
  path.join(__dirname, '../src/data/onet/json/occupation_skills.json'),
  JSON.stringify(occupationSkills, null, 2)
);

console.log('Done! Wrote unique_skills.json and occupation_skills.json'); 