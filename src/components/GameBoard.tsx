import React from 'react';
import { Coordinate, CellState } from '../utils/probabilityCalculator';

interface Cell {
  state: CellState;
  shipId?: number;
  probability?: number;
}

interface Ship {
  id: number;
  length: number;
  positions: Coordinate[];
  hits: number;
  isSunk: boolean;
}

interface GameBoardProps {
  rows: number;
  cols: number;
  board: Cell[][];
  ships?: Ship[];
  showShips: boolean;
  showProbabilities: boolean;
  isPlayerBoard: boolean;
  onCellClick: (row: number, col: number) => void;
  placementPhase?: boolean;
  selectedShipIndex?: number;
  validatePlacement?: (row: number, col: number) => boolean;
  highlightBestMove?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  rows,
  cols,
  board,
  ships = [],
  showShips,
  showProbabilities,
  isPlayerBoard,
  onCellClick,
  placementPhase = false,
  selectedShipIndex,
  validatePlacement,
  highlightBestMove = false,
}) => {
  // Helper to determine cell class based on state
  const getCellClass = (cell: Cell, row: number, col: number, isBestMove: boolean): string => {
    const classes = ['cell'];

    // Add state-based classes
    if (cell.state === 'ship' && showShips) {
      classes.push('ship');
      
      // If we have ship info, add ship length class
      if (showShips && cell.shipId) {
        const ship = ships.find(s => s.id === cell.shipId);
        if (ship) {
          classes.push(`ship-length-${ship.length}`);
        }
      }
    }
    if (cell.state === 'hit') {
      classes.push('hit');
    }
    if (cell.state === 'miss') {
      classes.push('miss');
    }
    if (cell.state === 'sunk') {
      classes.push('sunk');
    }

    // For placement phase, show valid/invalid placement cells
    if (placementPhase && selectedShipIndex !== undefined && validatePlacement) {
      const isValid = validatePlacement(row, col);
      if (isValid) {
        classes.push('valid-placement');
      } else {
        classes.push('invalid-placement');
      }
    }

    // Add best-move class if this is the best move
    if (isBestMove) {
      classes.push('best-move');
    }

    return classes.join(' ');
  };

  // Calculate color for probability heatmap
  const getProbabilityColor = (probability: number): string => {
    if (probability === 0) return 'rgba(0, 0, 255, 0.1)'; // Low (blue)
    
    // Use a gradient from blue (low) to red (high)
    const r = Math.floor(255 * probability);
    const g = 0;
    const b = Math.floor(255 * (1 - probability));
    
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  };

  // Find the cell with the highest probability for best move highlighting
  const findBestMove = (): [number, number] | null => {
    if (!highlightBestMove || !showProbabilities) return null;
    
    let maxProb = -1;
    let bestMove: [number, number] | null = null;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        // Only consider untargeted cells
        if (cell.state !== 'hit' && cell.state !== 'miss' && cell.state !== 'sunk') {
          const prob = cell.probability || 0;
          if (prob > maxProb) {
            maxProb = prob;
            bestMove = [r, c];
          }
        }
      }
    }
    
    return bestMove;
  };
  
  const bestMove = findBestMove();

  // Render header row with column indices
  const renderHeader = () => (
    <div className="board-header">
      <div className="corner-cell"></div>
      {Array(cols).fill(0).map((_, colIndex) => (
        <div key={colIndex} className="header-cell">
          {colIndex}
        </div>
      ))}
    </div>
  );

  // Add drawing lines for ships to visualize ship types
  const renderCellContent = (cell: Cell, row: number, col: number): React.ReactNode => {
    // Case 1: Ship visualization for revealed ships
    if (showShips && cell.state === 'ship' && cell.shipId) {
      const ship = ships.find(s => s.id === cell.shipId);
      
      if (ship) {
        // Determine if this is part of a horizontal or vertical ship
        const shipPositions = ship.positions;
        const isHorizontal = shipPositions.length >= 2 && 
                            shipPositions[0][0] === shipPositions[1][0];
        
        // Determine if this is a bow, middle, or stern of the ship
        let position = "middle"; // Default
        
        if (isHorizontal) {
          // Find leftmost and rightmost cells
          const shipCols = shipPositions.map(pos => pos[1]);
          const minCol = Math.min(...shipCols);
          const maxCol = Math.max(...shipCols);
          
          if (col === minCol) position = "left";
          if (col === maxCol) position = "right";
        } else {
          // Find topmost and bottommost cells
          const shipRows = shipPositions.map(pos => pos[0]);
          const minRow = Math.min(...shipRows);
          const maxRow = Math.max(...shipRows);
          
          if (row === minRow) position = "top";
          if (row === maxRow) position = "bottom";
        }
        
        // Add ship segment class based on position and orientation
        return (
          <div className={`ship-segment ${position} ${isHorizontal ? 'horizontal' : 'vertical'} ship-length-${ship.length}`}>
            <div className="ship-connector"></div>
          </div>
        );
      }
    }
    
    // Case 2: Hit or sunk visualization
    if ((cell.state === 'hit' || cell.state === 'sunk') && cell.shipId && ships) {
      const ship = ships.find(s => s.id === cell.shipId);
      
      if (ship) {
        // Determine if this is part of a horizontal or vertical ship
        const shipPositions = ship.positions;
        const isHorizontal = shipPositions.length >= 2 && 
                            shipPositions[0][0] === shipPositions[1][0];
        
        // Determine if this is a bow, middle, or stern of the ship
        let position = "middle"; // Default
        
        if (isHorizontal) {
          // Find leftmost and rightmost cells
          const shipCols = shipPositions.map(pos => pos[1]);
          const minCol = Math.min(...shipCols);
          const maxCol = Math.max(...shipCols);
          
          if (col === minCol) position = "left";
          if (col === maxCol) position = "right";
        } else {
          // Find topmost and bottommost cells
          const shipRows = shipPositions.map(pos => pos[0]);
          const minRow = Math.min(...shipRows);
          const maxRow = Math.max(...shipRows);
          
          if (row === minRow) position = "top";
          if (row === maxRow) position = "bottom";
        }
        
        // Add ship segment class based on position and orientation
        return (
          <div className={`ship-segment ${position} ${isHorizontal ? 'horizontal' : 'vertical'} ship-length-${ship.length}`}>
            <div className="ship-connector"></div>
          </div>
        );
      }
    }
    
    // Case 3: Probability display
    if (showProbabilities && cell.probability !== undefined && cell.probability > 0 &&
        cell.state !== 'hit' && cell.state !== 'miss' && cell.state !== 'sunk' && 
        (!showShips || cell.state !== 'ship')) {
      return (
        <div 
          className="probability"
        >
          {Math.round(cell.probability * 100)}%
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={`game-board ${isPlayerBoard ? 'player-board' : 'opponent-board'}`}>
      <h3>{isPlayerBoard ? 'Your Board' : 'Opponent\'s Board'}</h3>
      
      {renderHeader()}
      
      <div className="board-grid" style={{ gridTemplateColumns: `auto repeat(${cols}, 1fr)` }}>
        {Array(rows).fill(0).map((_, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {/* Row header with row index */}
            <div className="row-header">{rowIndex}</div>
            
            {/* Board cells */}
            {Array(cols).fill(0).map((_, colIndex) => {
              const cell = board[rowIndex][colIndex];
              const isBestMove = !!bestMove && bestMove[0] === rowIndex && bestMove[1] === colIndex;
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClass(cell, rowIndex, colIndex, isBestMove)}
                  style={{
                    backgroundColor: showProbabilities && cell.probability !== undefined && 
                                    cell.state !== 'hit' && cell.state !== 'miss' && 
                                    cell.state !== 'sunk' && (!showShips || cell.state !== 'ship')
                      ? getProbabilityColor(cell.probability) 
                      : undefined,
                    // Add a red border for the best move
                    border: isBestMove ? '2px solid red' : undefined,
                    boxShadow: isBestMove ? '0 0 8px red' : undefined
                  }}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                >
                  {renderCellContent(cell, rowIndex, colIndex)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      {isPlayerBoard && ships && (
        <div className="ships-status">
          <h4>Ships Status</h4>
          <div className="ships-list">
            {ships.map((ship) => (
              <div 
                key={ship.id} 
                className={`ship-status ship-length-${ship.length} ${ship.isSunk ? 'sunk' : ''}`}
              >
                <div className="ship-visual">
                  {Array(ship.length).fill(0).map((_, i) => (
                    <div 
                      key={i} 
                      className={`ship-segment ${i < ship.hits ? 'hit' : ''}`}
                    ></div>
                  ))}
                </div>
                <div className="ship-info">
                  Length: {ship.length} | Hits: {ship.hits}/{ship.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard; 