'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
  hover?: boolean;
  className?: string;
}

export default function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  scale = 0.8,
  hover = true,
  className = '',
}: ScaleInProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: scale,
      }}
      whileInView={{
        opacity: 1,
        scale: 1,
      }}
      whileHover={
        hover
          ? {
              scale: 1.05,
              transition: { duration: 0.2 },
            }
          : {}
      }
      whileTap={hover ? { scale: 0.95 } : {}}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
