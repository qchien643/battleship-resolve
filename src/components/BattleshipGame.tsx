import React, { useState, useEffect, useCallback } from 'react';
import GameSetup from './GameSetup';
import GameBoard from './GameBoard';
import { 
  calculateProbabilityMap, 
  Coordinate, 
  CellState,
  ProbabilityMode,
  SunkShip,
  analyzeHitPatterns,
  getActiveHits
} from '../utils/probabilityCalculator';

// Define interfaces for cells, ships, and players
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

interface Player {
  board: Cell[][];
  ships: Ship[];
  hits: Coordinate[];
  misses: Coordinate[];
  sunkShips: SunkShip[];
}

type GamePhase = 'setup' | 'play' | 'gameOver';

export interface GameState {
  rows: number;
  cols: number;
  shipLengths: number[];
  developerMode: boolean;
  gamePhase: GamePhase;
  player1: Player | null; // Player making the guesses
  player2: Player | null; // Opponent (either real or simulated)
  turnNumber: number;
  gameStats: {
    totalShots: number;
    hits: number;
    misses: number;
  };
  probabilityMode: ProbabilityMode;
}

// Interface for game configuration
interface GameConfig {
  gridSize: { rows: number; cols: number };
  shipLengths: number[];
  developerMode: boolean;
  difficulty: 'normal' | 'hard' | 'optimized';
}

const BattleshipGame: React.FC = () => {
  // Game configuration
  const [rows, setRows] = useState<number>(10);
  const [cols, setCols] = useState<number>(10);
  const [shipLengths, setShipLengths] = useState<number[]>([]);
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [probabilityMode, setProbabilityMode] = useState<ProbabilityMode>(ProbabilityMode.NORMAL);

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [gameStats, setGameStats] = useState<{
    totalShots: number;
    hits: number;
    misses: number;
  }>({
    totalShots: 0,
    hits: 0,
    misses: 0,
  });
  const [highlightBestMove, setHighlightBestMove] = useState(true);
  const [showOpponentMap, setShowOpponentMap] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Coordinate | null>(null);
  const [manualFeedbackMode, setManualFeedbackMode] = useState(false);

  // Initialize game state after setup
  const handleGameStart = (config: GameConfig) => {
    const { gridSize, shipLengths, developerMode, difficulty } = config;
    
    setRows(gridSize.rows);
    setCols(gridSize.cols);
    setShipLengths(shipLengths);
    setDeveloperMode(developerMode);
    setManualFeedbackMode(!developerMode); // Manual feedback only in normal mode
    
    // Set probability mode based on difficulty
    setProbabilityMode(
      difficulty === 'hard' 
        ? ProbabilityMode.SUPER_AGGRESSIVE 
        : difficulty === 'optimized'
          ? ProbabilityMode.OPTIMIZED
          : ProbabilityMode.NORMAL
    );
    
    // Initialize empty boards
    const emptyBoard = Array(gridSize.rows)
      .fill(null)
      .map(() => 
        Array(gridSize.cols)
          .fill(null)
          .map(() => ({ state: 'empty' as CellState }))
      );
    
    // Initialize players
    const player1 = {
      board: [...emptyBoard],
      ships: [],
      hits: [],
      misses: [],
      sunkShips: []
    };
    
    const player2 = {
      board: [...emptyBoard],
      ships: [],
      hits: [],
      misses: [],
      sunkShips: []
    };
    
    setPlayer1(player1);
    
    // If in developer mode, automatically place ships for opponent
    if (developerMode) {
      const { board, ships } = generateRandomShipPlacements(gridSize.rows, gridSize.cols, shipLengths);
      setPlayer2({
        ...player2,
        board,
        ships
      });
    } else {
      setPlayer2(player2);
    }
    
    // Reset game stats
    setGameStats({
      totalShots: 0,
      hits: 0,
      misses: 0,
    });
    
    // Move to play phase
    setGamePhase('play');
    setTurnNumber(1);
    setShowOpponentMap(false);
  };

  // Generate random ship placements for the opponent in developer mode
  const generateRandomShipPlacements = (boardRows: number, boardCols: number, ships: number[]): { board: Cell[][], ships: Ship[] } => {
    // Create an empty board
    const newBoard: Cell[][] = Array(boardRows)
      .fill(null)
      .map(() => 
        Array(boardCols)
          .fill(null)
          .map(() => ({ state: 'empty' as CellState }))
      );
    
    // Create ships with random placements
    const placedShips: Ship[] = [];
    
    for (let i = 0; i < ships.length; i++) {
      const shipLength = ships[i];
      let placed = false;
      
      while (!placed) {
        // Randomly decide orientation (0 = horizontal, 1 = vertical)
        const isHorizontal = Math.random() < 0.5;
        
        // Calculate maximum starting row and column
        const maxRow = isHorizontal ? boardRows - 1 : boardRows - shipLength;
        const maxCol = isHorizontal ? boardCols - shipLength : boardCols - 1;
        
        // Generate random start position
        const startRow = Math.floor(Math.random() * (maxRow + 1));
        const startCol = Math.floor(Math.random() * (maxCol + 1));
        
        // Check if placement is valid
        let isValid = true;
        const positions: Coordinate[] = [];
        
        for (let j = 0; j < shipLength; j++) {
          const row = isHorizontal ? startRow : startRow + j;
          const col = isHorizontal ? startCol + j : startCol;
          
          if (row >= boardRows || col >= boardCols || newBoard[row][col].state !== 'empty') {
            isValid = false;
            break;
          }
          
          positions.push([row, col]);
        }
        
        // If valid, place the ship
        if (isValid) {
          const ship: Ship = {
            id: i + 1,
            length: shipLength,
            positions,
            hits: 0,
            isSunk: false,
          };
          
          placedShips.push(ship);
          
          // Update the board
          for (const [row, col] of positions) {
            newBoard[row][col] = {
              state: 'ship',
              shipId: i + 1,
            };
          }
          
          placed = true;
        }
      }
    }
    
    return { board: newBoard, ships: placedShips };
  };

  // Handle player guess (select a cell)
  const handleCellSelect = (row: number, col: number) => {
    if (gamePhase !== 'play' || !player1 || !player2) return;
    
    // If we've already selected or attacked this cell, ignore the click
    const targetCell = player2.board[row][col];
    if (targetCell.state === 'hit' || targetCell.state === 'miss' || targetCell.state === 'sunk') {
      return;
    }
    
    if (manualFeedbackMode) {
      // In manual feedback mode, just select the cell and wait for user feedback
      setSelectedCell([row, col]);
    } else {
      // In developer mode, process the attack immediately
      processAttack(row, col);
    }
  };

  // Process an attack based on the selected cell
  const processAttack = (row: number, col: number, manualResult?: 'hit' | 'miss') => {
    if (gamePhase !== 'play' || !player1 || !player2) return;
    
    const targetCell = player2.board[row][col];
    
    // If cell was already targeted, do nothing
    if (targetCell.state === 'hit' || targetCell.state === 'miss' || targetCell.state === 'sunk') {
      return;
    }
    
    let isHit = false;
    let isSunk = false;
    let sunkShip: SunkShip | null = null;
    
    // Create copies for updating state
    const newOpponentBoard = [...player2.board];
    const newOpponentShips = [...player2.ships];
    const newPlayerHits = [...player1.hits];
    const newPlayerMisses = [...player1.misses];
    const newPlayerSunkShips = [...player1.sunkShips];
    
    // Update game stats
    const newStats = { 
      ...gameStats, 
      totalShots: gameStats.totalShots + 1 
    };
    
    // In manual mode, use the provided result
    if (manualFeedbackMode && manualResult) {
      isHit = manualResult === 'hit';
      
      if (isHit) {
        newOpponentBoard[row][col] = { ...targetCell, state: 'hit' };
        newPlayerHits.push([row, col]);
        newStats.hits += 1;
        
        // Check if we've manually identified a ship as sunk
        // We'll need to prompt the user for this information in a real-world scenario
        // For now, we'll infer it from any aligned hits that form a complete ship
        const hitPatterns = analyzeHitPatterns(newPlayerHits, newPlayerSunkShips);
        
        for (const alignedGroup of hitPatterns.alignedGroups) {
          // Check if the aligned group is a potential complete ship
          const groupLength = alignedGroup.coordinates.length;
          
          // If the group length matches one of the remaining ship lengths, it might be a complete ship
          if (shipLengths.includes(groupLength) && 
              !newPlayerSunkShips.some(ship => ship.length === groupLength)) {
            
            // We should prompt the user to confirm if this ship is sunk
            // For now, we'll assume it is if it's the appropriate length
            sunkShip = {
              length: groupLength,
              positions: alignedGroup.coordinates
            };
            
            newPlayerSunkShips.push(sunkShip);
            
            // Update the board to show the sunk ship
            for (const [sunkRow, sunkCol] of alignedGroup.coordinates) {
              newOpponentBoard[sunkRow][sunkCol] = { 
                ...newOpponentBoard[sunkRow][sunkCol], 
                state: 'sunk' 
              };
            }
            
            break;
          }
        }
      } else {
        newOpponentBoard[row][col] = { ...targetCell, state: 'miss' };
        newPlayerMisses.push([row, col]);
        newStats.misses += 1;
      }
    } 
    // In developer mode, check the actual ship placement
    else if (developerMode) {
      if (targetCell.state === 'ship') {
        // Hit a ship
        isHit = true;
        newOpponentBoard[row][col] = { ...targetCell, state: 'hit' };
        newPlayerHits.push([row, col]);
        newStats.hits += 1;
        
        // Update ship hit count and check if sunk
        const shipId = targetCell.shipId!;
        const shipIndex = newOpponentShips.findIndex(s => s.id === shipId);
        const ship = { ...newOpponentShips[shipIndex] };
        
        ship.hits += 1;
        if (ship.hits === ship.length) {
          ship.isSunk = true;
          isSunk = true;
          
          // Create a SunkShip object
          sunkShip = {
            length: ship.length,
            positions: [...ship.positions]
          };
          
          // Add to player's sunk ships list
          newPlayerSunkShips.push(sunkShip);
          
          // Update all ship cells to 'sunk' state
          ship.positions.forEach(([shipRow, shipCol]) => {
            newOpponentBoard[shipRow][shipCol] = { 
              ...newOpponentBoard[shipRow][shipCol], 
              state: 'sunk' 
            };
          });
        }
        
        newOpponentShips[shipIndex] = ship;
      } else {
        // Miss
        newOpponentBoard[row][col] = { ...targetCell, state: 'miss' };
        newPlayerMisses.push([row, col]);
        newStats.misses += 1;
      }
    }
    
    // Update state
    setPlayer2({
      ...player2,
      board: newOpponentBoard,
      ships: newOpponentShips
    });
    
    setPlayer1({
      ...player1,
      hits: newPlayerHits,
      misses: newPlayerMisses,
      sunkShips: newPlayerSunkShips
    });
    
    setGameStats(newStats);
    setTurnNumber(turnNumber + 1);
    setSelectedCell(null);
    
    // Check for game over (all ships sunk in developer mode)
    if (developerMode && newOpponentShips.every(ship => ship.isSunk)) {
      setGamePhase('gameOver');
    }
  };

  // Handle manual feedback for a selected cell
  const handleManualFeedback = (result: 'hit' | 'miss') => {
    if (!selectedCell) return;
    
    processAttack(selectedCell[0], selectedCell[1], result);
    
    // After a hit, check for potential completed ships
    if (result === 'hit' && player1) {
      const newPlayerHits = [...player1.hits, selectedCell];
      const hitPatterns = analyzeHitPatterns(newPlayerHits, player1.sunkShips);
      
      // If we have aligned hits, check if they might form a complete ship
      for (const group of hitPatterns.alignedGroups) {
        const groupLength = group.coordinates.length;
        
        // Check if this might be a complete ship (based on length)
        if (shipLengths.includes(groupLength) &&
            !player1.sunkShips.some(ship => ship.length === groupLength)) {
          
          // Ask the user if this ship is sunk
          if (confirm(`Is the ${groupLength}-length ship sunk?`)) {
            // Create a new sunk ship
            const newSunkShip: SunkShip = {
              length: groupLength,
              positions: [...group.coordinates]
            };
            
            // Update the player's sunk ships
            setPlayer1({
              ...player1,
              sunkShips: [...player1.sunkShips, newSunkShip]
            });
            
            // Update the board display to show the sunk ship
            const newBoard = [...player2!.board];
            for (const [row, col] of group.coordinates) {
              newBoard[row][col] = {
                ...newBoard[row][col],
                state: 'sunk'
              };
            }
            
            setPlayer2({
              ...player2!,
              board: newBoard
            });
            
            // Exit the loop after sinking one ship
            break;
          }
        }
      }
    }
  };

  // Calculate probability map for the current state
  const getProbabilityMap = useCallback(() => {
    if (gamePhase !== 'play' || !player1 || !player2) return null;
    
    // Get the remaining ship lengths (for developer mode)
    let remainingShips: number[] = [];
    
    if (developerMode && player2.ships.length > 0) {
      remainingShips = player2.ships
        .filter(ship => !ship.isSunk)
        .map(ship => ship.length);
    } else {
      // In manual mode, use the default ship lengths minus any sunk ships
      // Calculate remaining ships by subtracting sunk ships
      const sunkLengths = player1.sunkShips.map(ship => ship.length);
      remainingShips = shipLengths.filter(length => {
        const index = sunkLengths.indexOf(length);
        if (index !== -1) {
          sunkLengths.splice(index, 1); // Remove the found length
          return false;
        }
        return true;
      });
    }
    
    // Get active hits (exclude hits that are part of sunk ships)
    const activeHits = getActiveHits(player1.hits, player1.sunkShips);
    
    // Only show active hits for developer mode display
    if (activeHits.length > 0) {
      console.log(`Active hits: ${activeHits.length}, Total hits: ${player1.hits.length}`);
    }
    
    return calculateProbabilityMap(
      rows,
      cols,
      player1.hits,
      player1.misses,
      remainingShips,
      probabilityMode,
      player1.sunkShips
    );
  }, [gamePhase, player1, player2, rows, cols, shipLengths, developerMode, probabilityMode]);

  // Update probability map whenever the game state changes
  useEffect(() => {
    if (gamePhase === 'play' && player1 && player2) {
      const probMap = getProbabilityMap();
      
      if (probMap) {
        // Apply probability map to the opponent's board
        const updatedBoard = player2.board.map((row, rowIndex) => 
          row.map((cell, colIndex) => ({
            ...cell,
            probability: probMap[rowIndex][colIndex]
          }))
        );
        
        // Use a functional update to avoid dependency issues
        setPlayer2(prev => {
          // Skip the update if the probabilities haven't actually changed
          // This prevents infinite loops
          if (prev && JSON.stringify(updatedBoard) === JSON.stringify(prev.board)) {
            return prev;
          }
          return {
            ...prev!,
            board: updatedBoard
          };
        });
      }
    }
  }, [gamePhase, player1?.hits, player1?.misses, getProbabilityMap]);

  // Reset the game
  const handleReset = () => {
    setGamePhase('setup');
    setPlayer1(null);
    setPlayer2(null);
    setTurnNumber(1);
    setGameStats({
      totalShots: 0,
      hits: 0,
      misses: 0,
    });
    setSelectedCell(null);
    setShowOpponentMap(false);
  };

  // Render the appropriate phase
  const renderGamePhase = () => {
    switch (gamePhase) {
      case 'setup':
        return <GameSetup 
          devModeEnabled={true}
          onStartGame={handleGameStart}
        />;
        
      case 'play':
        if (!player1 || !player2) return null;
        
        return (
          <div className="play-phase">
            <div className="game-info">
              <h2>Battleship Prediction Tool</h2>
              <h3>Turn {turnNumber}</h3>
              
              <div className="game-stats">
                <p>
                  Shots: {gameStats.totalShots} | 
                  Hits: {gameStats.hits} | 
                  Misses: {gameStats.misses} | 
                  Hit Rate: {gameStats.totalShots > 0 ? Math.round((gameStats.hits / gameStats.totalShots) * 100) : 0}%
                </p>
              </div>

              <div className="game-controls">
                <label className="highlight-toggle">
                  <input 
                    type="checkbox" 
                    checked={highlightBestMove} 
                    onChange={() => setHighlightBestMove(!highlightBestMove)} 
                  />
                  Highlight Best Move
                </label>
                
                {developerMode && (
                  <button 
                    className="toggle-map-button"
                    onClick={() => setShowOpponentMap(!showOpponentMap)}
                  >
                    {showOpponentMap ? 'Hide Map' : 'Show Map'}
                  </button>
                )}
              </div>
              
              {selectedCell && manualFeedbackMode && (
                <div className="manual-feedback">
                  <p>Selected Cell: ({selectedCell[0]}, {selectedCell[1]})</p>
                  <div className="feedback-buttons">
                    <button 
                      className="hit-button" 
                      onClick={() => handleManualFeedback('hit')}
                    >
                      Hit
                    </button>
                    <button 
                      className="miss-button" 
                      onClick={() => handleManualFeedback('miss')}
                    >
                      Miss
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="game-boards">
              <GameBoard
                rows={rows}
                cols={cols}
                board={player2.board}
                ships={player2.ships}
                showShips={false} // Never show ships directly on the main game board
                showProbabilities={true}
                isPlayerBoard={false}
                onCellClick={handleCellSelect}
                highlightBestMove={highlightBestMove}
              />
              
              {/* Only show the ship map in developer mode when toggled */}
              {developerMode && showOpponentMap && (
                <div className="ship-map">
                  <h3>Ship Positions</h3>
                  <div className="ship-map-board">
                    <GameBoard
                      rows={rows}
                      cols={cols}
                      board={player2.board}
                      ships={player2.ships}
                      showShips={true} // Always show ships on the map
                      showProbabilities={false}
                      isPlayerBoard={true}
                      onCellClick={() => {}} // No interaction
                      highlightBestMove={false}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="turn-instructions">
              {manualFeedbackMode ? (
                <p>Click on the board to select a cell, then use the Hit/Miss buttons to provide feedback.</p>
              ) : (
                <p>Click on the board to make a guess. The probability of a ship being at each location is shown as a percentage.</p>
              )}
              {developerMode && <p className="dev-mode-notice">Developer Mode: {showOpponentMap ? 'Ship map visible' : 'Ship map hidden'}</p>}
            </div>
          </div>
        );
        
      case 'gameOver':
        return (
          <div className="game-over">
            <h2>Game Completed!</h2>
            <h3>All enemy ships sunk!</h3>
            
            <div className="game-stats">
              <h4>Game Statistics</h4>
              <p>Total Shots: {gameStats.totalShots}</p>
              <p>Hits: {gameStats.hits}</p>
              <p>Misses: {gameStats.misses}</p>
              <p>Hit Rate: {gameStats.totalShots > 0 ? Math.round((gameStats.hits / gameStats.totalShots) * 100) : 0}%</p>
            </div>
            
            <button onClick={handleReset}>Start New Game</button>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Add a function to render the developer mode UI
  const renderDeveloperInfo = () => {
    if (!developerMode || gamePhase !== 'play') return null;
    
    let difficultyDisplay;
    let difficultyClass;
    
    if (probabilityMode === ProbabilityMode.OPTIMIZED) {
      difficultyDisplay = 'Optimized';
      difficultyClass = 'difficulty-optimized';
    } else if (probabilityMode === ProbabilityMode.SUPER_AGGRESSIVE) {
      difficultyDisplay = 'Hard';
      difficultyClass = 'difficulty-hard';
    } else {
      difficultyDisplay = 'Normal';
      difficultyClass = 'difficulty-normal';
    }
    
    return (
      <div className="developer-info">
        <h3>Developer Mode Info</h3>
        <div className="dev-stats">
          <p>AI Difficulty: <span className={`difficulty-indicator ${difficultyClass}`}>{difficultyDisplay}</span></p>
          <p>Game Phase: {gamePhase}</p>
          <p>Turn: {turnNumber}</p>
          <p>Shots Fired: {gameStats.totalShots}</p>
          <p>Hits: {gameStats.hits}</p>
          <p>Misses: {gameStats.misses}</p>
          <p>Hit Rate: {gameStats.totalShots > 0 ? Math.round((gameStats.hits / gameStats.totalShots) * 100) : 0}%</p>
        </div>
      </div>
    );
  };

  return (
    <div className="battleship-game">
      <h1>Battleship Prediction Tool</h1>
      {renderGamePhase()}
      {renderDeveloperInfo()}
    </div>
  );
};

export default BattleshipGame; 