'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const DIGIT_HEIGHT = 32; // px, adjust for your font size
const ANIMATION_DURATION = 0.6; // seconds

function RollingDigit({ digit }: { digit: number }) {
  return (
    <span style={{ height: DIGIT_HEIGHT, overflow: 'hidden', display: 'inline-block', width: '1ch' }}>
      <motion.span
        key={digit}
        initial={{ y: -DIGIT_HEIGHT }}
        animate={{ y: 0 }}
        exit={{ y: DIGIT_HEIGHT }}
        transition={{ duration: ANIMATION_DURATION, type: 'spring', bounce: 0.3 }}
        style={{ display: 'inline-block' }}
      >
        <span style={{ height: DIGIT_HEIGHT, display: 'block', fontWeight: 700, color: '#2563eb', fontSize: 'inherit' }}>{digit}</span>
      </motion.span>
    </span>
  );
}

const QuestCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/majors-count');
        const data = await res.json();
        setCount(data.count || 0);
      } catch {
        setCount(0);
      }
    }
    fetchCount();
  }, []);

  // Split count into digits, keep leading zeros for smooth animation
  const digits = count.toLocaleString().split("");

  return (
    <span style={{ fontWeight: 700, color: '#2563eb', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', fontSize: 'inherit' }}>
      {digits.map((char, idx) =>
        /\d/.test(char) ? (
          <RollingDigit key={idx + '-' + char} digit={parseInt(char)} />
        ) : (
          <span key={idx + '-sep'} style={{ width: '0.5ch', display: 'inline-block' }}>{char}</span>
        )
      )}
    </span>
  );
};

export default QuestCounter; 