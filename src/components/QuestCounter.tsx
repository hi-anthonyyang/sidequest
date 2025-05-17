'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DIGIT_HEIGHT = 32; // px, adjust for your font size
const ANIMATION_DURATION = 0.6; // seconds

function RollingDigit({ digit }: { digit: number }) {
  return (
    <div style={{ height: DIGIT_HEIGHT, overflow: 'hidden', display: 'inline-block', width: '1ch' }}>
      <motion.div
        key={digit}
        initial={{ y: -DIGIT_HEIGHT }}
        animate={{ y: 0 }}
        exit={{ y: DIGIT_HEIGHT }}
        transition={{ duration: ANIMATION_DURATION, type: 'spring', bounce: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <span style={{ height: DIGIT_HEIGHT, display: 'block', fontWeight: 700, color: '#2563eb', fontSize: 'inherit' }}>{digit}</span>
      </motion.div>
    </div>
  );
}

const QuestCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Calculate days since start date (May 1, 2025)
    const startDate = new Date('2025-05-01');
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalIncrement = daysDiff * 9;
    setCount(totalIncrement);
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