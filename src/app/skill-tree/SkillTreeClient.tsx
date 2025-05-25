"use client";
import dynamic from "next/dynamic";
const SkillTree = dynamic(() => import("./SkillTree"), { ssr: false });

export default function SkillTreeClient() {
  return <SkillTree />;
} 