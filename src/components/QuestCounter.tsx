'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const QuestCounter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Calculate days since start date (May 1, 2025)
    const startDate = new Date('2025-05-01');
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Increment by 9 for each day passed
    const totalIncrement = daysDiff * 9;
    setCount(totalIncrement);
  }, []);

  return (
    <motion.span
      key={count}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="font-bold text-blue-600"
    >
      {count.toLocaleString()}
    </motion.span>
  );
};

export default QuestCounter; 