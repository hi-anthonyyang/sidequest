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
      // Optionally add more fields here
    };
  }
}

// 2. Build occupation -> required skills mapping
const occupationSkills = {};
for (const occ of occData) {
  const code = occ['O*NET-SOC Code'];
  occupationSkills[code] = [];
}
for (const row of skillsData) {
  const code = row['O*NET-SOC Code'];
  const id = row['Element ID'];
  if (occupationSkills[code] && !occupationSkills[code].includes(id)) {
    occupationSkills[code].push(id);
  }
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