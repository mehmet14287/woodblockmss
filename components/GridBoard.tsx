
import React from 'react';

interface Props {
  grid: number[][];
  onCellClick?: (row: number, col: number) => void;
  previewPlacement?: { row: number, col: number, shape: number[][] } | null;
}

const GridBoard = React.memo(React.forwardRef<any, Props>(({ grid, onCellClick, previewPlacement }, ref) => {
  // Internal ref to attach to the actual DOM node
  const domRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef<{[key: string]: HTMLDivElement | null}>({});

  React.useImperativeHandle(ref, () => ({
    // Use domRef.current to access the actual DOM element
    getBoundingClientRect: () => domRef.current?.getBoundingClientRect(),
    highlightCells: (positions: {r: number, c: number}[] | null) => {
      // Reset all
      Object.values(cellRefs.current).forEach(el => {
        if(el) (el as HTMLElement).classList.remove('bg-amber-500/50');
      });
      // Highlight new
      if(positions) {
        positions.forEach(({r, c}) => {
          const el = cellRefs.current[`${r}-${c}`];
          if(el && !el.classList.contains('filled')) { 
            el.classList.add('bg-amber-500/50');
          }
        });
      }
    }
  }));

  const isSubgridAlt = (r: number, c: number) => {
    const boxRow = Math.floor(r / 3);
    const boxCol = Math.floor(c / 3);
    return (boxRow + boxCol) % 2 !== 0;
  };

  return (
    <div 
      ref={domRef}
      className="relative p-1 sm:p-2 bg-[#5d4037] rounded-lg shadow-2xl border-4 border-[#3e2723] touch-none select-none hardware-accelerated"
    >
      <div className="grid grid-rows-9 gap-[2px]">
        {grid.map((row, rIndex) => (
          <div key={rIndex} className="grid grid-cols-9 gap-[2px]">
            {row.map((cell, cIndex) => {
              const isFilled = cell === 1;
              // We handle highlighting via Direct DOM manipulation in highlightCells now
              // to avoid re-renders of the entire board during drag.
              
              return (
                <div
                  key={`${rIndex}-${cIndex}`}
                  ref={el => { cellRefs.current[`${rIndex}-${cIndex}`] = el; }}
                  data-row={rIndex}
                  data-col={cIndex}
                  onClick={() => onCellClick && onCellClick(rIndex, cIndex)}
                  className={`
                    w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-sm transition-colors duration-150
                    flex items-center justify-center overflow-hidden relative
                    ${isFilled 
                      ? 'filled bg-amber-600 shadow-[inset_-2px_-2px_2px_rgba(0,0,0,0.3)] border-t border-white/20 animate-pop' 
                      : isSubgridAlt(rIndex, cIndex) ? 'bg-[#4e342e]/80' : 'bg-[#3e2723]/60' 
                    }
                  `}
                >
                   {isFilled && (
                     <div 
                       className="absolute inset-0 opacity-20"
                       style={{
                         backgroundImage: `
                           linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent),
                           linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)
                         `,
                         backgroundSize: '4px 4px'
                       }}
                     />
                   )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}), (prevProps, nextProps) => {
    // Custom comparison for React.memo to prevent re-renders when only preview changes (handled by DOM)
    return prevProps.grid === nextProps.grid;
});

export default GridBoard;
