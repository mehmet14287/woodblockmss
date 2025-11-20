
import React from 'react';

interface Props {
  grid: number[][];
  onCellClick?: (row: number, col: number) => void;
  previewPlacement?: { row: number, col: number, shape: number[][] } | null;
}

const GridBoard = React.forwardRef<HTMLDivElement, Props>(({ grid, onCellClick, previewPlacement }, ref) => {
  const isSubgridAlt = (r: number, c: number) => {
    const boxRow = Math.floor(r / 3);
    const boxCol = Math.floor(c / 3);
    return (boxRow + boxCol) % 2 !== 0;
  };

  return (
    <div 
      ref={ref}
      className="relative p-1 sm:p-2 bg-[#5d4037] rounded-lg shadow-2xl border-4 border-[#3e2723] touch-none select-none"
    >
      <div className="grid grid-rows-9 gap-[2px]">
        {grid.map((row, rIndex) => (
          <div key={rIndex} className="grid grid-cols-9 gap-[2px]">
            {row.map((cell, cIndex) => {
              const isFilled = cell === 1;
              
              // Determine preview (hover)
              let isPreview = false;
              if (previewPlacement) {
                const rRel = rIndex - previewPlacement.row;
                const cRel = cIndex - previewPlacement.col;
                if (
                   rRel >= 0 && 
                   rRel < previewPlacement.shape.length &&
                   cRel >= 0 &&
                   cRel < previewPlacement.shape[0].length &&
                   previewPlacement.shape[rRel][cRel] === 1
                 ) {
                   isPreview = true;
                 }
              }
              
              return (
                <div
                  key={`${rIndex}-${cIndex}`}
                  data-row={rIndex}
                  data-col={cIndex}
                  onClick={() => onCellClick && onCellClick(rIndex, cIndex)}
                  className={`
                    w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-sm transition-colors duration-150
                    flex items-center justify-center overflow-hidden relative
                    ${isFilled 
                      ? 'bg-amber-600 shadow-[inset_-2px_-2px_2px_rgba(0,0,0,0.3)] border-t border-white/20' 
                      : isSubgridAlt(rIndex, cIndex) ? 'bg-[#4e342e]/80' : 'bg-[#3e2723]/60' 
                    }
                    ${isPreview && !isFilled ? 'bg-amber-500/50' : ''}
                  `}
                >
                   {/* Inner "wood" detail via CSS instead of external image for offline support */}
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
});

GridBoard.displayName = 'GridBoard';

export default GridBoard;
