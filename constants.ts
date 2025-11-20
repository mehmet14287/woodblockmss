import { BlockPiece } from './types';

export const GRID_SIZE = 9;

export const PIECE_SHAPES: Record<string, number[][]> = {
  SINGLE: [[1]],
  DOUBLE_H: [[1, 1]],
  DOUBLE_V: [[1], [1]],
  TRIPLE_H: [[1, 1, 1]],
  TRIPLE_V: [[1], [1], [1]],
  L_SHAPE: [
    [1, 0],
    [1, 0],
    [1, 1]
  ],
  J_SHAPE: [
    [0, 1],
    [0, 1],
    [1, 1]
  ],
  SQUARE_2x2: [
    [1, 1],
    [1, 1]
  ],
  SQUARE_3x3: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ],
  T_SHAPE: [
    [1, 1, 1],
    [0, 1, 0]
  ]
};

export const PIECE_COLORS = [
  'bg-amber-600',
  'bg-orange-600',
  'bg-yellow-700',
  'bg-red-800',
  'bg-amber-700'
];

export const LEVEL_THRESHOLDS = [
  0,
  500,   // Level 2
  1500,  // Level 3
  3000,  // Level 4
  5000,  // Level 5
  10000  // Level 6
];

export const generateRandomPiece = (): BlockPiece => {
  const keys = Object.keys(PIECE_SHAPES);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type: randomKey,
    shape: PIECE_SHAPES[randomKey],
    color: color
  };
};

export const createEmptyGrid = (): number[][] => 
  Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
