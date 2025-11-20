
import React, { useState, useEffect, useRef } from 'react';
import GridBoard from './components/GridBoard';
import BlockPiece from './components/BlockPiece';
import GameControls from './components/GameControls';
import ParticleOverlay from './components/ParticleOverlay';
import { playComboSound, playPlaceSound, startBackgroundMusic, stopBackgroundMusic } from './utils/audio';
import { 
  GRID_SIZE, 
  createEmptyGrid, 
  generateRandomPiece, 
  LEVEL_THRESHOLDS 
} from './constants';
import { BlockPiece as BlockPieceType } from './types';

// Helper to check matches on a given board state (pure function)
const findMatches = (board: number[][]) => {
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const boxesToClear: {r: number, c: number}[] = [];

    // Rows
    for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r].every(cell => cell === 1)) rowsToClear.push(r);
    }
    // Cols
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) if (board[r][c] === 0) { full = false; break; }
        if (full) colsToClear.push(c);
    }
    // Boxes
    for (let br = 0; br < 9; br += 3) {
        for (let bc = 0; bc < 9; bc += 3) {
            let full = true;
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (board[br + r][bc + c] === 0) { full = false; break; }
            if (full) boxesToClear.push({ r: br, c: bc });
        }
    }
    return { rows: rowsToClear, cols: colsToClear, boxes: boxesToClear };
};

// Helper to create direct particle explosions without React
const createParticleExplosion = (x: number, y: number, color: string) => {
    const particleCount = 3; 
    for (let i = 0; i < particleCount; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        const size = 6 + Math.random() * 6;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.backgroundColor = color;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        document.body.appendChild(el);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 30;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity + 30;
        const rotation = Math.random() * 360;

        const animation = el.animate([
            { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${rotation}deg)`, opacity: 0 }
        ], {
            duration: 400 + Math.random() * 200,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards'
        });
        animation.onfinish = () => el.remove();
    }
};

const FPSCounter = () => {
    const [fps, setFps] = useState(0);
    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let afId: number;
        const loop = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                setFps(Math.round((frameCount * 1000) / (now - lastTime)));
                frameCount = 0;
                lastTime = now;
            }
            afId = requestAnimationFrame(loop);
        };
        afId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(afId);
    }, []);
    return (
        <div className="absolute top-2 right-2 bg-black/50 text-green-400 text-xs font-mono p-1 rounded z-50 pointer-events-none">
            FPS: {fps}
        </div>
    );
};

const App: React.FC = () => {
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
  
  const gridRef = useRef<any>(null);
  const dragItemRef = useRef<HTMLDivElement>(null);
  
  // Stores the latest raw pointer position from the event listener
  const pointerPosRef = useRef({ x: 0, y: 0 });

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    pieceIndex: number;
    initialX: number;
    initialY: number;
    dragOffset: { x: number, y: number };
    gridCellSize: number;
    isTouch: boolean;
  } | null>(null);

  const previewRef = useRef<{ row: number, col: number, shape: number[][] } | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<{ failedPiece: BlockPieceType, message: string } | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('woodblock_music');
    if (saved) setIsMusicOn(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('woodblock_music', JSON.stringify(isMusicOn));
    if (isMusicOn) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') {
            const resumeAudio = () => {
                ctx.resume();
                startBackgroundMusic();
                window.removeEventListener('click', resumeAudio);
                window.removeEventListener('touchstart', resumeAudio);
            };
            window.addEventListener('click', resumeAudio);
            window.addEventListener('touchstart', resumeAudio);
        } else {
            startBackgroundMusic();
        }
    } else {
        stopBackgroundMusic();
    }
  }, [isMusicOn]);

  const toggleMusic = () => setIsMusicOn(p => !p);

  const canPlacePiece = React.useCallback((
    board: number[][],
    piece: BlockPieceType,
    row: number,
    col: number
  ): boolean => {
    const shape = piece.shape;
    const rLen = shape.length;
    const cLen = shape[0].length;
    if (row < 0 || col < 0 || row + rLen > GRID_SIZE || col + cLen > GRID_SIZE) return false;
    for (let r = 0; r < rLen; r++) {
      for (let c = 0; c < cLen; c++) {
        if (shape[r][c] === 1 && board[row + r][col + c] === 1) return false;
      }
    }
    return true;
  }, []);

  const checkMatches = (board: number[][]) => {
    const { rows, cols, boxes } = findMatches(board);

    const lines = rows.length + cols.length + boxes.length;
    if (lines > 0) {
      playComboSound(lines);
      
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (gridRect) {
        const cellSize = gridRect.width / 9;
        const getCenter = (r: number, c: number) => ({
            x: gridRect.left + (c * cellSize) + (cellSize / 2),
            y: gridRect.top + (r * cellSize) + (cellSize / 2)
        });

        const clearedCells = new Set<string>();
        rows.forEach(r => { for(let c=0; c<9; c++) clearedCells.add(`${r}-${c}`); });
        cols.forEach(c => { for(let r=0; r<9; r++) clearedCells.add(`${r}-${c}`); });
        boxes.forEach(b => { for(let r=0; r<3; r++) for(let c=0; c<3; c++) clearedCells.add(`${b.r+r}-${b.c+c}`); });

        clearedCells.forEach(key => {
            const [r, c] = key.split('-').map(Number);
            const pos = getCenter(r, c);
            createParticleExplosion(pos.x, pos.y, '#f59e0b');
        });
      }

      let newScore = 100 * (lines === 1 ? 1 : lines === 2 ? 3 : lines === 3 ? 6 : 10);
      addScore(newScore);

      const newGrid = board.map(row => [...row]);
      rows.forEach(r => { for(let c=0; c<GRID_SIZE; c++) newGrid[r][c] = 0; });
      cols.forEach(c => { for(let r=0; r<GRID_SIZE; r++) newGrid[r][c] = 0; });
      boxes.forEach(box => { for(let r=0; r<3; r++) for(let c=0; c<3; c++) newGrid[box.r + r][box.c + c] = 0; });

      setGrid(newGrid);
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
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (newScore >= LEVEL_THRESHOLDS[i]) newLevel = i + 1;
      setLevel(newLevel);
      return newScore;
    });
  };

  const checkGameOver = (board: number[][], pieces: (BlockPieceType | null)[]) => {
    const available = pieces.filter(p => p !== null) as BlockPieceType[];
    if (available.length === 0) return null;
    for (const piece of available) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlacePiece(board, piece, r, c)) return null;
        }
      }
    }
    return { failedPiece: available[0], message: "Bu parça sığmıyor!" };
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (!currentPieces[index]) return;
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    let gridCellSize = 32;
    if (gridRef.current) gridCellSize = gridRef.current.getBoundingClientRect().width / 9;
    
    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const elevation = isTouch ? 160 : 0;

    // Set initial position for the rendering loop
    pointerPosRef.current = { x: e.clientX, y: e.clientY };

    setDragState({
      isDragging: true,
      pieceIndex: index,
      initialX: e.clientX - offsetX,
      initialY: e.clientY - offsetY - elevation,
      dragOffset: { x: offsetX, y: offsetY },
      gridCellSize,
      isTouch
    });
  };

  // Separate Render Loop for stable FPS
  useEffect(() => {
    if (!dragState) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const TARGET_FPS = 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const loop = (time: number) => {
        const delta = time - lastTime;
        
        // Render Logic: Cap at 60FPS
        if (delta >= FRAME_INTERVAL) {
            lastTime = time - (delta % FRAME_INTERVAL);

            const { x: clientX, y: clientY } = pointerPosRef.current;

            // 1. Move the element using DIRECT DOM Manipulation
            if (dragItemRef.current) {
                const elevation = dragState.isTouch ? 160 : 0;
                const x = clientX - dragState.dragOffset.x;
                const y = clientY - dragState.dragOffset.y - elevation;
                dragItemRef.current.style.transform = `translate(${x}px, ${y}px)`;
            }

            // 2. Grid Logic (Highlighting)
            if (gridRef.current && currentPieces[dragState.pieceIndex]) {
                const gridRect = gridRef.current.getBoundingClientRect();
                const piece = currentPieces[dragState.pieceIndex]!;
                
                const elevation = dragState.isTouch ? 160 : 0;
                const pieceLeft = clientX - dragState.dragOffset.x;
                const pieceTop = clientY - dragState.dragOffset.y - elevation;

                const relativeX = pieceLeft - gridRect.left + (dragState.gridCellSize / 2);
                const relativeY = pieceTop - gridRect.top + (dragState.gridCellSize / 2);
                
                const col = Math.floor(relativeX / dragState.gridCellSize);
                const row = Math.floor(relativeY / dragState.gridCellSize);

                if (canPlacePiece(grid, piece, row, col)) {
                    previewRef.current = { row, col, shape: piece.shape };
                    
                    const placementPositions: {r: number, c: number}[] = [];
                    const clearingPositions: {r: number, c: number}[] = [];

                    // Create a lightweight simulation grid
                    const simulatedGrid = grid.map(r => [...r]);

                    for(let r=0; r<piece.shape.length; r++){
                        for(let c=0; c<piece.shape[0].length; c++){
                            if(piece.shape[r][c]) {
                                placementPositions.push({r: row+r, c: col+c});
                                simulatedGrid[row+r][col+c] = 1;
                            }
                        }
                    }

                    // Check for potential matches
                    const matches = findMatches(simulatedGrid);
                    if (matches.rows.length > 0 || matches.cols.length > 0 || matches.boxes.length > 0) {
                        matches.rows.forEach(rIndex => {
                            for(let cIndex=0; cIndex<9; cIndex++) clearingPositions.push({r: rIndex, c: cIndex});
                        });
                        matches.cols.forEach(cIndex => {
                            for(let rIndex=0; rIndex<9; rIndex++) clearingPositions.push({r: rIndex, c: cIndex});
                        });
                        matches.boxes.forEach(box => {
                            for(let br=0; br<3; br++) for(let bc=0; bc<3; bc++) clearingPositions.push({r: box.r+br, c: box.c+bc});
                        });
                    }
                    
                    // Pass both placement and clearing data
                    gridRef.current.highlightCells(placementPositions, clearingPositions);
                } else {
                    previewRef.current = null;
                    gridRef.current.highlightCells(null, null);
                }
            }
        }
        
        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dragState, grid, currentPieces, canPlacePiece]);

  // Lightweight event listener just to update coordinates
  useEffect(() => {
      if (!dragState) return;
      const handleMove = (e: PointerEvent) => {
          e.preventDefault();
          pointerPosRef.current = { x: e.clientX, y: e.clientY };
      };
      window.addEventListener('pointermove', handleMove, { passive: false });
      return () => window.removeEventListener('pointermove', handleMove);
  }, [dragState]);

  // Pointer Up Logic
  useEffect(() => {
    if (!dragState) return;
    const handleUp = (e: PointerEvent) => {
      e.preventDefault();
      
      let finalPlacement = previewRef.current;
      // Fallback calculation just in case
      if (gridRef.current && currentPieces[dragState.pieceIndex]) {
           const gridRect = gridRef.current.getBoundingClientRect();
           const piece = currentPieces[dragState.pieceIndex]!;
           const elevation = dragState.isTouch ? 160 : 0;
           const pieceLeft = e.clientX - dragState.dragOffset.x;
           const pieceTop = e.clientY - dragState.dragOffset.y - elevation;
           const relativeX = pieceLeft - gridRect.left + (dragState.gridCellSize / 2);
           const relativeY = pieceTop - gridRect.top + (dragState.gridCellSize / 2);
           const col = Math.floor(relativeX / dragState.gridCellSize);
           const row = Math.floor(relativeY / dragState.gridCellSize);
           
           if (canPlacePiece(grid, piece, row, col)) {
               finalPlacement = { row, col, shape: piece.shape };
           } else {
               finalPlacement = null;
           }
      }

      if (finalPlacement && currentPieces[dragState.pieceIndex]) {
        const piece = currentPieces[dragState.pieceIndex]!;
        const { row, col } = finalPlacement;
        
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
        playPlaceSound();

        const newPieces = [...currentPieces];
        newPieces[dragState.pieceIndex] = null;
        setCurrentPieces(newPieces);

        checkMatches(newGrid);

        if (newPieces.every(p => p === null)) {
           setTimeout(() => {
             const nextPieces = [generateRandomPiece(), generateRandomPiece(), generateRandomPiece()];
             setCurrentPieces(nextPieces);
             const result = checkGameOver(newGrid, nextPieces);
             if (result) setGameOverInfo(result);
           }, 200);
        } else {
           const result = checkGameOver(newGrid, newPieces);
           if (result) setGameOverInfo(result);
        }
      }

      setDragState(null);
      previewRef.current = null;
      if (gridRef.current) gridRef.current.highlightCells(null, null);
    };
    
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [dragState, grid, currentPieces, canPlacePiece]);

  const handleRestart = () => {
    localStorage.removeItem('woodblock_gamestate');
    setGrid(createEmptyGrid());
    setCurrentPieces([generateRandomPiece(), generateRandomPiece(), generateRandomPiece()]);
    setScore(0);
    setLevel(1);
    setGameOverInfo(null);
    setDragState(null);
    previewRef.current = null;
  };

  return (
    <div className="min-h-screen wood-texture flex items-center justify-center p-4 selection:bg-transparent overflow-hidden">
      <FPSCounter />
      <div className="max-w-lg w-full flex flex-col items-center relative">
        <h1 className="text-3xl md:text-4xl font-black text-[#3e2723] mb-2 drop-shadow-sm tracking-tighter select-none">
          SnapWood <span className="text-amber-100">Block</span>
        </h1>

        <GameControls 
          score={score} 
          level={level} 
          highScore={highScore}
          onReset={handleRestart}
          isMusicOn={isMusicOn}
          onToggleMusic={toggleMusic}
        />

        <div className="mb-8 relative z-10">
          <GridBoard 
            ref={gridRef}
            grid={grid} 
          />
        </div>

        <div className="w-full bg-[#3e2723]/40 p-4 rounded-xl backdrop-blur-sm min-h-[160px] flex items-center justify-center gap-4 md:gap-8 touch-none relative z-20">
          {currentPieces.map((piece, idx) => (
            <div key={idx} className="flex-1 flex items-center justify-center min-w-[80px] h-[100px]">
              {piece && (
                <div className={`transition-opacity duration-200 ${dragState?.pieceIndex === idx ? 'opacity-0' : 'opacity-100'}`}>
                   <BlockPiece 
                      piece={piece} 
                      size="md"
                      className="cursor-grab active:cursor-grabbing hover:scale-105"
                      onInteract={(e) => handlePointerDown(e, idx)}
                   />
                </div>
              )}
            </div>
          ))}
        </div>

        {dragState && currentPieces[dragState.pieceIndex] && (
          <div 
             ref={dragItemRef}
             className="fixed pointer-events-none z-[9999] hardware-accelerated"
             style={{
               left: 0, top: 0,
               transform: `translate(${dragState.initialX}px, ${dragState.initialY}px)`
             }}
          >
            <BlockPiece 
              piece={currentPieces[dragState.pieceIndex]!} 
              customCellSize={dragState.gridCellSize}
              isSelected={true}
            />
          </div>
        )}

        <div className="mt-4 text-amber-200/70 text-xs text-center select-none font-medium tracking-widest">
          Made in MŞS Studio
        </div>

        {gameOverInfo && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
            <div className="bg-white p-8 rounded-2xl text-center max-w-xs w-full shadow-2xl border-4 border-amber-600 animate-bounce-in">
              <h2 className="text-3xl font-black text-stone-800 mb-2">Hamle Yok!</h2>
              <p className="text-stone-500 mb-4">Oyun Bitti</p>
              
              <div className="bg-stone-100 p-4 rounded-lg mb-4 flex flex-col items-center">
                <p className="text-xs text-stone-400 mb-2 uppercase font-bold">Bu parça sığmadı</p>
                <BlockPiece piece={gameOverInfo.failedPiece} size="sm" className="pointer-events-none opacity-80 scale-75 origin-center" />
              </div>

              <div className="text-5xl font-bold text-amber-600 mb-6">{score}</div>
              <button onClick={handleRestart} className="w-full bg-amber-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-amber-500 active:scale-95 transition-all">Tekrar Oyna</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
