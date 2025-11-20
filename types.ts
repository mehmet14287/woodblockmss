export type Shape = number[][]; // 2D array representing the piece shape (1s and 0s)

export interface BlockPiece {
  id: string;
  type: string; // 'L', 'T', 'I', 'Square', etc.
  shape: Shape;
  color: string;
}

export interface GameState {
  grid: number[][]; // 9x9 grid, 0=empty, 1=filled
  score: number;
  level: number;
  currentPieces: (BlockPiece | null)[];
  gameOver: boolean;
  highScore: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface AIHint {
  pieceIndex: number;
  position: Position;
  reasoning: string;
}

export interface SearchResult {
  title: string;
  uri: string;
}
