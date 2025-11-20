
import React, { useState, useEffect, useRef } from 'react';
import GridBoard from './components/GridBoard';
import BlockPiece from './components/BlockPiece';
import GameControls from './components/GameControls';
import ParticleOverlay from './components/ParticleOverlay';
import { playComboSound, startBackgroundMusic, stopBackgroundMusic } from './utils/audio';
import { 
  GRID_SIZE, 
  createEmptyGrid, 
  generateRandomPiece, 
  LEVEL_THRESHOLDS 
} from './constants';
import { BlockPiece as BlockPieceType } from './types';

const App: React.FC = () => {
  // --- State ---
  const [grid, setGrid] = useState<number[][]>(createEmptyGrid());
  const [currentPieces, setCurrentPieces] = useState<(BlockPieceType | null)[]>([
    generateRandomPiece(), 
    generateRandomPiece(), 
    generateRandomPiece()
  ]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('woodblock_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // --- Drag State ---
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    pieceIndex: number;
    startPos: { x: number, y: number }; // Where the pointer started
    currentPos: { x: number, y: number }; // Where the pointer is now
    dragOffset: { x: number, y: number }; // Offset from piece top-left to pointer
    gridCellSize: number; // Snapshot of grid cell size at drag start
  } | null>(null);

  const [previewPlacement, setPreviewPlacement] = useState<{ row: number, col: number, shape: number[][] } | null>(null);

  // Game State
  const [gameOver, setGameOver] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(false);

  // Effects State
  const [effects, setEffects] = useState<{x: number, y: number, color: string}[]>([]);

  // --- Game Logic Helpers ---

  const toggleMusic = () => {
    if (isMusicOn) {
      stopBackgroundMusic();
      setIsMusicOn(false);
    } else {
      startBackgroundMusic();
      setIsMusicOn(true);
    }
  };

  const canPlacePiece = (
    board: number[][],
    piece: BlockPieceType,
    row: number,
    col: number
  ): boolean => {
    const shape = piece.shape;
    const rLen = shape.length;
    const cLen = shape[0].length;

    // Check boundaries
    if (row < 0 || col < 0 || row + rLen > GRID_SIZE || col + cLen > GRID_SIZE) return false;

    // Check overlap
    for (let r = 0; r < rLen; r++) {
      for (let c = 0; c < cLen; c++) {
        if (shape[r][c] === 1 && board[row + r][col + c] === 1) {
          return false;
        }
      }
    }
    return true;
  };

  const checkMatches = (board: number[][]) => {
    let newScore = 0;
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const boxesToClear: {r: number, c: number}[] = [];

    // Check Rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r].every(cell => cell === 1)) rowsToClear.push(r);
    }

    // Check Cols
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] === 0) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(c);
    }

    // Check 3x3 Boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        let full = true;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (board[br + r][bc + c] === 0) {
              full = false;
              break;
            }
          }
        }
        if (full) boxesToClear.push({ r: br, c: bc });
      }
    }

    const lines = rowsToClear.length + colsToClear.length + boxesToClear.length;
    if (lines > 0) {
      // Audio Effect
      playComboSound(lines);

      // Visual Effects Calculation
      const newEffects: {x: number, y: number, color: string}[] = [];
      const gridRect = gridRef.current?.getBoundingClientRect();
      
      if (gridRect) {
        const cellSize = gridRect.width / 9;
        
        // Helper to get center of a cell
        const getCenter = (r: number, c: number) => ({
          x: gridRect.left + (c * cellSize) + (cellSize/2),
          y: gridRect.top + (r * cellSize) + (cellSize/2)
        });

        // Add effect for middle of cleared rows
        rowsToClear.forEach(r => {
          const center = getCenter(r, 4);
          newEffects.push({ x: center.x, y: center.y, color: '#f59e0b' }); // Amber
        });

        // Add effect for middle of cleared cols
        colsToClear.forEach(c => {
          const center = getCenter(4, c);
          newEffects.push({ x: center.x, y: center.y, color: '#f59e0b' });
        });

        // Add effect for center of cleared boxes
        boxesToClear.forEach(box => {
          const center = getCenter(box.r + 1, box.c + 1);
          newEffects.push({ x: center.x, y: center.y, color: '#fbbf24' }); // Yellow
        });
      }

      setEffects(prev => [...prev, ...newEffects]);

      const comboMultiplier = lines === 1 ? 1 : lines === 2 ? 3 : lines === 3 ? 6 : 10;
      newScore += 100 * comboMultiplier;

      const newGrid = board.map(row => [...row]);
      
      rowsToClear.forEach(r => {
        for(let c=0; c<GRID_SIZE; c++) newGrid[r][c] = 0;
      });
      
      colsToClear.forEach(c => {
        for(let r=0; r<GRID_SIZE; r++) newGrid[r][c] = 0;
      });

      boxesToClear.forEach(box => {
        for(let r=0; r<3; r++) {
          for(let c=0; c<3; c++) {
            newGrid[box.r + r][box.c + c] = 0;
          }
        }
      });

      setGrid(newGrid);
      addScore(newScore);
    }
  };

  const addScore = (points: number) => {
    setScore(prev => {
      const newScore = prev + points;
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('woodblock_highscore', newScore.toString());
      }
      let newLevel = 1;
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (newScore >= LEVEL_THRESHOLDS[i]) {
          newLevel = i + 1;
        }
      }
      setLevel(newLevel);
      return newScore;
    });
  };

  const checkGameOver = (board: number[][], pieces: (BlockPieceType | null)[]) => {
    const available = pieces.filter(p => p !== null) as BlockPieceType[];
    if (available.length === 0) return false;

    for (const piece of available) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlacePiece(board, piece, r, c)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // --- Drag & Drop Logic ---

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    // Only start drag if piece exists
    if (!currentPieces[index]) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    let gridCellSize = 32; // fallback
    if (gridRef.current) {
      gridCellSize = gridRef.current.getBoundingClientRect().width / 9;
    }

    setDragState({
      isDragging: true,
      pieceIndex: index,
      startPos: { x: e.clientX, y: e.clientY },
      currentPos: { x: e.clientX, y: e.clientY },
      dragOffset: { x: offsetX, y: offsetY },
      gridCellSize
    });
  };

  // Global Pointer Events for Dragging
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      
      setDragState(prev => prev ? {
        ...prev,
        currentPos: { x: e.clientX, y: e.clientY }
      } : null);

      if (gridRef.current && currentPieces[dragState.pieceIndex]) {
        const gridRect = gridRef.current.getBoundingClientRect();
        const piece = currentPieces[dragState.pieceIndex]!;
        
        // Calculate top-left of the piece
        const pieceLeft = e.clientX - dragState.dragOffset.x;
        const pieceTop = e.clientY - dragState.dragOffset.y;

        // Map top-left of piece to grid cell coordinates
        const relativeX = pieceLeft - gridRect.left + (dragState.gridCellSize / 2);
        const relativeY = pieceTop - gridRect.top + (dragState.gridCellSize / 2);
        
        const col = Math.floor(relativeX / dragState.gridCellSize);
        const row = Math.floor(relativeY / dragState.gridCellSize);

        if (canPlacePiece(grid, piece, row, col)) {
          setPreviewPlacement({ row, col, shape: piece.shape });
        } else {
          setPreviewPlacement(null);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();

      // Commit Move if valid
      if (previewPlacement && dragState && currentPieces[dragState.pieceIndex]) {
        const piece = currentPieces[dragState.pieceIndex]!;
        const { row, col } = previewPlacement;
        
        // 1. Update Grid
        const newGrid = grid.map(r => [...r]);
        let blocksPlaced = 0;
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[0].length; c++) {
            if (piece.shape[r][c] === 1) {
              newGrid[row + r][col + c] = 1;
              blocksPlaced++;
            }
          }
        }
        setGrid(newGrid);
        addScore(blocksPlaced * 10);

        // 2. Remove piece from hand
        const newPieces = [...currentPieces];
        newPieces[dragState.pieceIndex] = null;
        setCurrentPieces(newPieces);

        // 3. Logic (Check matches triggers sound and effects)
        checkMatches(newGrid);
        
        // 4. Refill & Game Over Check
        if (newPieces.every(p => p === null)) {
          setTimeout(() => {
            const nextPieces = [generateRandomPiece(), generateRandomPiece(), generateRandomPiece()];
            setCurrentPieces(nextPieces);
            if (checkGameOver(newGrid, nextPieces)) setGameOver(true);
          }, 200);
        } else {
           if (checkGameOver(newGrid, newPieces)) setGameOver(true);
        }
      }

      // Reset State
      setDragState(null);
      setPreviewPlacement(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, grid, currentPieces, previewPlacement]);

  const handleRestart = () => {
    setGrid(createEmptyGrid());
    setCurrentPieces([generateRandomPiece(), generateRandomPiece(), generateRandomPiece()]);
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setDragState(null);
  };

  return (
    <div className="min-h-screen wood-texture flex items-center justify-center p-4 selection:bg-transparent overflow-hidden">
      {/* Effect Layer */}
      <ParticleOverlay bursts={effects} onComplete={() => setEffects([])} />

      <div className="max-w-lg w-full flex flex-col items-center relative">
        
        <h1 className="text-3xl md:text-4xl font-black text-[#3e2723] mb-2 drop-shadow-sm tracking-tighter select-none">
          WOODBLOCK <span className="text-amber-100">ZEN</span>
        </h1>

        <GameControls 
          score={score} 
          level={level} 
          highScore={highScore}
          onReset={handleRestart}
          isMusicOn={isMusicOn}
          onToggleMusic={toggleMusic}
        />

        {/* Main Grid */}
        <div className="mb-8 relative z-10">
          <GridBoard 
            ref={gridRef}
            grid={grid} 
            previewPlacement={previewPlacement}
          />
        </div>

        {/* Piece Selection Area (Hand) */}
        <div className="w-full bg-[#3e2723]/40 p-4 rounded-xl backdrop-blur-sm min-h-[140px] flex items-center justify-center gap-4 md:gap-8 touch-none relative z-20">
          {currentPieces.map((piece, idx) => (
            <div key={idx} className="flex-1 flex items-center justify-center min-w-[80px] h-[100px]">
              {piece && (
                <div 
                  className={`transition-opacity duration-200 ${dragState?.pieceIndex === idx ? 'opacity-0' : 'opacity-100'}`}
                >
                   <BlockPiece 
                      piece={piece} 
                      size="sm"
                      className="cursor-grab active:cursor-grabbing hover:scale-105"
                      onInteract={(e) => handlePointerDown(e, idx)}
                   />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dragged Piece Portal/Overlay */}
        {dragState && currentPieces[dragState.pieceIndex] && (
          <div 
             className="fixed pointer-events-none z-[9999]"
             style={{
               left: dragState.currentPos.x - dragState.dragOffset.x,
               top: dragState.currentPos.y - dragState.dragOffset.y,
             }}
          >
            <BlockPiece 
              piece={currentPieces[dragState.pieceIndex]!} 
              customCellSize={dragState.gridCellSize}
              isSelected={true} // Adds shadow and brightness
            />
          </div>
        )}

        <div className="mt-4 text-stone-400 text-xs text-center select-none">
          Blokları tahtaya sürükleyin. Puan kazanmak için satırları temizleyin.
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
            <div className="bg-white p-8 rounded-2xl text-center max-w-xs w-full shadow-2xl border-4 border-amber-600 animate-bounce-in">
              <h2 className="text-4xl font-black text-stone-800 mb-2">Hamle Yok!</h2>
              <p className="text-stone-500 mb-6">Oyun Bitti</p>
              <div className="text-6xl font-bold text-amber-600 mb-8">{score}</div>
              <button 
                onClick={handleRestart}
                className="w-full bg-amber-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-amber-500 active:scale-95 transition-all"
              >
                Tekrar Oyna
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
