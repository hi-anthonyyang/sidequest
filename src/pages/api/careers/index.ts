// Legacy route kept for backward compatibility.
// Prefer app router endpoints under src/app/api/*.
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const filePath = path.join(process.cwd(), 'public/data/onet/json/Occupation Data_Occupation_Data.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.status(200).json(data);
}