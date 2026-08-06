export const motion = {
  duration: {
    instant: 90,
    fast: 140,
    normal: 220,
    slow: 340,
  },
  spring: {
    damping: 22,
    stiffness: 320,
    mass: 0.85,
  },
  soft: {
    damping: 26,
    stiffness: 220,
    mass: 0.9,
  },
  snappy: {
    damping: 28,
    stiffness: 420,
    mass: 0.7,
  },
  settle: {
    damping: 24,
    stiffness: 280,
    mass: 0.8,
  },
  pressScale: 0.97,
  cardPressScale: 0.985,
} as const;

export type MotionSpring = typeof motion.spring;
