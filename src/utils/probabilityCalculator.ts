/**
 * Probability Calculator for Battleship Game
 * 
 * This module implements the probability calculation algorithm for the Battleship game.
 * It calculates the probability of a ship being present at each cell on the board
 * based on the current game state (hits, misses, and remaining ships).
 * 
 * Based on the Probability Density Function approach described in:
 * https://www.geeksforgeeks.org/play-battleships-game-with-ai/
 */

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
  state: CellState;
  shipId?: number;
}

export interface Ship {
  id: number;
  length: number;
  positions: [number, number][]; // Array of [row, col] coordinates
  hits: number;
  isSunk: boolean;
}

// Add an interface for tracking sunk ships
export interface SunkShip {
  length: number;
  positions: Coordinate[];
}

export type Board = Cell[][];
export type ProbabilityMap = number[][];
export type Coordinate = [number, number]; // [row, col]

export enum ProbabilityMode {
  NORMAL = 'normal',              // Standard probability calculation
  HUNTING = 'hunting',            // Looking for initial hits
  TARGETING = 'targeting',        // Focusing on likely ship positions after a hit
  SUPER_AGGRESSIVE = 'aggressive', // Highly aggressive targeting strategy
  OPTIMIZED = 'optimized'         // Optimized for minimum number of shots
}

// Direction vectors for adjacent cells (up, right, down, left)
const ADJACENT_DIRECTIONS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

// Direction names for easier reference
const DIRECTION_NAMES = ['up', 'right', 'down', 'left'];

// Factor to increase probability for cells adjacent to hits
const ADJACENCY_FACTOR = 3.0;

// Factor to increase probability for cells in line with multiple hits
const ALIGNMENT_FACTOR = 4.0;

// Factor to increase probability for cells that would complete a ship
const COMPLETION_FACTOR = 5.0;

// Super aggressive factors - higher weighting for the aggressive mode
const SUPER_ADJACENCY_FACTOR = 5.0;
const SUPER_ALIGNMENT_FACTOR = 8.0;
const SUPER_COMPLETION_FACTOR = 10.0;

// Optimized minimum step factors
const OPTIMIZED_ADJACENCY_FACTOR = 10.0;
const OPTIMIZED_ALIGNMENT_FACTOR = 15.0;
const OPTIMIZED_COMPLETION_FACTOR = 20.0;
const OPTIMIZED_PATTERN_FACTOR = 5.0;
const ENTROPY_WEIGHT = 0.3; // Slightly reduce entropy weight to prioritize adjacent cells

/**
 * Calculates the probability map for a Battleship game
 * 
 * @param boardHeight - Height of the board (number of rows)
 * @param boardWidth - Width of the board (number of columns)
 * @param hits - Array of coordinates where hits have been recorded
 * @param misses - Array of coordinates where misses have been recorded
 * @param remainingShips - Array of ships that have not been sunk yet
 * @param mode - Probability calculation mode (normal, hunting, targeting)
 * @param sunkShips - Array of ships that have been sunk
 * @returns A 2D array representing the probability of a ship being at each cell
 */
export function calculateProbabilityMap(
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[],
  remainingShips: number[], // Array of remaining ship lengths
  mode: ProbabilityMode = ProbabilityMode.NORMAL,
  sunkShips: SunkShip[] = [] // New parameter to track sunk ships
): ProbabilityMap {
  // Initialize the probability map with zeros
  const probabilityMap: ProbabilityMap = Array(boardHeight)
    .fill(0)
    .map(() => Array(boardWidth).fill(0));
  
  // If there are no remaining ships, return the zero-filled probability map
  if (remainingShips.length === 0) {
    return probabilityMap;
  }

  // Automatically switch to targeting mode if we have hits but no sunken ships
  if (mode === ProbabilityMode.NORMAL && hits.length > 0) {
    mode = ProbabilityMode.TARGETING;
  }

  // Count how many valid ship placements include each cell
  const cellPlacementCount: number[][] = Array(boardHeight)
    .fill(0)
    .map(() => Array(boardWidth).fill(0));
  
  // Keep track of total valid placements
  let totalPlacements = 0;

  // For each remaining ship, find all valid placements and update the cell counts
  for (const shipLength of remainingShips) {
    const validPlacements = generateValidPlacements(
      boardHeight,
      boardWidth,
      shipLength,
      hits,
      misses,
      sunkShips // Pass sunk ships for analysis but not for exclusion
    );

    totalPlacements += validPlacements.length;

    // Increment the count for each cell in each valid placement
    for (const placement of validPlacements) {
      for (const [row, col] of placement) {
        cellPlacementCount[row][col]++;
      }
    }
  }
  
  // If no valid placements were found, return the zero-filled probability map
  if (totalPlacements === 0) {
    return probabilityMap;
  }

  // Calculate the probability for each cell by dividing the count by the total placements
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      // Skip cells that are already hit or missed
      if (isCoordinateInList([row, col], hits) || isCoordinateInList([row, col], misses)) {
        probabilityMap[row][col] = 0;
      } else {
        probabilityMap[row][col] = cellPlacementCount[row][col] / totalPlacements;
      }
    }
  }

  // Apply different strategies based on mode
  switch (mode) {
    case ProbabilityMode.HUNTING:
      // In hunting mode, we're looking for the first hit
      // Use a checkerboard pattern which is more efficient for hunting
      applyCheckerboardPattern(probabilityMap, boardHeight, boardWidth);
      break;
      
    case ProbabilityMode.TARGETING:
      // In targeting mode, focus on cells near existing hits
      applyTargetingStrategy(probabilityMap, boardHeight, boardWidth, hits, misses);
      break;
      
    case ProbabilityMode.SUPER_AGGRESSIVE:
      // Super aggressive targeting that focuses heavily on aligned patterns
      applySuperAggressiveStrategy(probabilityMap, boardHeight, boardWidth, hits, misses);
      break;
      
    case ProbabilityMode.OPTIMIZED:
      // Optimized strategy to minimize total shots
      applyOptimizedStrategy(probabilityMap, boardHeight, boardWidth, hits, misses, remainingShips, sunkShips);
      break;
      
    case ProbabilityMode.NORMAL:
    default:
      // Apply the standard adjacency bonus to cells next to hits
      const adjacentCells = getAdjacentCells(boardHeight, boardWidth, hits, misses);
      for (const [row, col] of adjacentCells) {
        // Multiply the probability by the adjacency factor, but cap at 1.0
        probabilityMap[row][col] = Math.min(1.0, probabilityMap[row][col] * ADJACENCY_FACTOR);
      }
      break;
  }

  // Apply the minimum score to all non-zero probabilities to ensure there's always a valid move
  normalizeMap(probabilityMap, boardHeight, boardWidth);

  return probabilityMap;
}

/**
 * Normalizes the probability map to ensure values are between 0 and 1
 * and the sum of all probabilities equals 1
 * 
 * @param probabilityMap - The probability map to normalize
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 */
function normalizeMap(
  probabilityMap: ProbabilityMap, 
  boardHeight: number, 
  boardWidth: number
): void {
  let sum = 0;
  let validCells = 0;
  
  // Calculate the sum of all probabilities
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      if (probabilityMap[row][col] > 0) {
        sum += probabilityMap[row][col];
        validCells++;
      }
    }
  }
  
  // If there are no valid cells or the sum is 0, nothing to normalize
  if (validCells === 0 || sum === 0) {
    return;
  }
  
  // Normalize all probabilities
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] /= sum;
      }
    }
  }
}

/**
 * Applies a checkerboard pattern to the probability map for more efficient hunting
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 */
function applyCheckerboardPattern(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number
): void {
  // Apply a checkerboard pattern - cells on opposite corners of each 2x2 square
  // are highly likely to contain parts of a ship
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      // If it's not a priority cell in the checkerboard pattern, reduce its probability
      if ((row + col) % 2 === 1 && probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= 0.5;
      }
    }
  }
}

/**
 * Applies a targeting strategy to the probability map focusing on likely ship configurations
 * near existing hits
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 */
function applyTargetingStrategy(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[]
): void {
  // If no hits, nothing to do
  if (hits.length === 0) {
    return;
  }
  
  // Check if we have multiple hits in a row or column
  const alignedHits = findAlignedHits(hits);
  
  if (alignedHits.length >= 2) {
    // We have aligned hits, focus on extending the line
    const {direction, coordinates} = alignedHits[0];
    
    // Get potential extension points
    const extensions = getExtensionPoints(coordinates, direction, boardHeight, boardWidth, misses);
    
    // Boost probabilities for extension points
    for (const [row, col] of extensions) {
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= ALIGNMENT_FACTOR;
      }
    }
  } else {
    // No aligned hits, focus on adjacent cells
    const adjacentCells = getAdjacentCells(boardHeight, boardWidth, hits, misses);
    
    for (const [row, col] of adjacentCells) {
      // Boost probabilities for adjacent cells
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= ADJACENCY_FACTOR;
      }
    }
    
    // Check for potential completions (cells that would complete a ship)
    const completions = findPotentialCompletions(
      boardHeight, 
      boardWidth, 
      hits, 
      misses, 
      findSmallestRemainingShip(probabilityMap, boardHeight, boardWidth)
    );
    
    // Boost probabilities for potential completions
    for (const [row, col] of completions) {
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= COMPLETION_FACTOR;
      }
    }
  }
}

/**
 * Applies a super aggressive targeting strategy that heavily focuses on 
 * patterns and likely ship positions
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 */
function applySuperAggressiveStrategy(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[]
): void {
  // If no hits, use an enhanced checkerboard pattern
  if (hits.length === 0) {
    applyCheckerboardPattern(probabilityMap, boardHeight, boardWidth);
    return;
  }
  
  // Check if we have multiple hits in a row or column
  const alignedHits = findAlignedHits(hits);
  
  if (alignedHits.length >= 2) {
    // We have aligned hits, strongly focus on extending the line
    for (const {direction, coordinates} of alignedHits) {
      // Get potential extension points
      const extensions = getExtensionPoints(coordinates, direction, boardHeight, boardWidth, misses);
      
      // Strongly boost probabilities for extension points
      for (const [row, col] of extensions) {
        if (probabilityMap[row][col] > 0) {
          probabilityMap[row][col] *= SUPER_ALIGNMENT_FACTOR;
        }
      }
    }
  } else {
    // No aligned hits yet, focus heavily on adjacent cells
    const adjacentCells = getAdjacentCells(boardHeight, boardWidth, hits, misses);
    
    for (const [row, col] of adjacentCells) {
      // Strongly boost probabilities for adjacent cells
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= SUPER_ADJACENCY_FACTOR;
      }
    }
  }
  
  // Check for potential completions (cells that would complete a ship)
  const completions = findPotentialCompletions(
    boardHeight, 
    boardWidth, 
    hits, 
    misses, 
    findSmallestRemainingShip(probabilityMap, boardHeight, boardWidth)
  );
  
  // Strongly boost probabilities for potential completions
  for (const [row, col] of completions) {
    if (probabilityMap[row][col] > 0) {
      probabilityMap[row][col] *= SUPER_COMPLETION_FACTOR;
    }
  }
  
  // Look for patterns that might indicate ship positions
  applyPatternRecognition(probabilityMap, boardHeight, boardWidth, hits, misses);
}

/**
 * Applies pattern recognition to identify high-probability targets
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 */
function applyPatternRecognition(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[]
): void {
  // Look for cross patterns: if two or more hits form an L or T shape,
  // prioritize the connecting cell at the corner
  
  for (const hit1 of hits) {
    for (const hit2 of hits) {
      // Skip if same hit
      if (hit1[0] === hit2[0] && hit1[1] === hit2[1]) continue;
      
      // Check if they share a row or column
      if (hit1[0] === hit2[0] || hit1[1] === hit2[1]) continue;
      
      // They form a potential corner, check the corner cells
      const corner1: Coordinate = [hit1[0], hit2[1]];
      const corner2: Coordinate = [hit2[0], hit1[1]];
      
      // If the corner is valid and not already hit or missed, boost it
      if (isValidCell(corner1[0], corner1[1], boardHeight, boardWidth) && 
          !isCoordinateInList(corner1, hits) && 
          !isCoordinateInList(corner1, misses)) {
        probabilityMap[corner1[0]][corner1[1]] *= 1.5;
      }
      
      if (isValidCell(corner2[0], corner2[1], boardHeight, boardWidth) && 
          !isCoordinateInList(corner2, hits) && 
          !isCoordinateInList(corner2, misses)) {
        probabilityMap[corner2[0]][corner2[1]] *= 1.5;
      }
    }
  }
}

/**
 * Helper function to check if a cell is within board boundaries
 * 
 * @param row - The row coordinate
 * @param col - The column coordinate
 * @param height - The board height
 * @param width - The board width
 * @returns True if the cell is within boundaries, false otherwise
 */
function isValidCell(
  row: number, 
  col: number, 
  height: number, 
  width: number
): boolean {
  return row >= 0 && row < height && col >= 0 && col < width;
}

/**
 * Finds the size of the smallest remaining ship based on the probability map
 * 
 * @param probabilityMap - The probability map
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @returns The length of the smallest remaining ship
 */
function findSmallestRemainingShip(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number
): number {
  // Default to 2 (smallest standard ship size)
  let smallestSize = 2;
  
  // Find the smallest ship that could still fit on the board
  // This is a heuristic based on looking for the smallest gap between misses/edges
  let maxConsecutiveEmpty = 0;
  
  // Check rows
  for (let row = 0; row < boardHeight; row++) {
    let consecutiveEmpty = 0;
    for (let col = 0; col < boardWidth; col++) {
      if (probabilityMap[row][col] > 0) {
        consecutiveEmpty++;
        maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutiveEmpty);
      } else {
        consecutiveEmpty = 0;
      }
    }
  }
  
  // Check columns
  for (let col = 0; col < boardWidth; col++) {
    let consecutiveEmpty = 0;
    for (let row = 0; row < boardHeight; row++) {
      if (probabilityMap[row][col] > 0) {
        consecutiveEmpty++;
        maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutiveEmpty);
      } else {
        consecutiveEmpty = 0;
      }
    }
  }
  
  // If we found a longer consecutive empty sequence, use that as our smallest ship size
  if (maxConsecutiveEmpty > smallestSize) {
    smallestSize = Math.min(maxConsecutiveEmpty, 5); // Cap at 5, which is the maximum ship size
  }
  
  return smallestSize;
}

/**
 * Finds potential ship completion points based on existing hits
 * 
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 * @param shipSize - Size of the ship to check completion for
 * @returns Array of coordinates that would complete a ship
 */
function findPotentialCompletions(
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[],
  shipSize: number
): Coordinate[] {
  const completions: Coordinate[] = [];
  const alignedGroups = findAlignedHits(hits);
  
  for (const {direction, coordinates} of alignedGroups) {
    // If the aligned hits are already the length of the ship, skip
    if (coordinates.length >= shipSize) continue;
    
    // Get extensions
    const extensions = getExtensionPoints(coordinates, direction, boardHeight, boardWidth, misses);
    
    // If we have exactly the number of hits required to complete the ship,
    // add these extensions as high-priority targets
    if (coordinates.length === shipSize - 1) {
      for (const extension of extensions) {
        completions.push(extension);
      }
    }
  }
  
  return completions;
}

/**
 * Finds groups of hits that are aligned in a row or column
 * 
 * @param hits - Coordinates of cells that have been hit
 * @returns Array of aligned hit groups, each with a direction and coordinates
 */
function findAlignedHits(hits: Coordinate[]): Array<{direction: 'horizontal' | 'vertical', coordinates: Coordinate[]}> {
  const result: Array<{direction: 'horizontal' | 'vertical', coordinates: Coordinate[]}> = [];
  
  // Group hits by row
  const hitsByRow = new Map<number, Coordinate[]>();
  // Group hits by column
  const hitsByCol = new Map<number, Coordinate[]>();
  
  for (const [row, col] of hits) {
    // Add to row map
    if (!hitsByRow.has(row)) {
      hitsByRow.set(row, []);
    }
    hitsByRow.get(row)!.push([row, col]);
    
    // Add to column map
    if (!hitsByCol.has(col)) {
      hitsByCol.set(col, []);
    }
    hitsByCol.get(col)!.push([row, col]);
  }
  
  // Find consecutive hits in rows
  for (const [row, rowHits] of hitsByRow.entries()) {
    if (rowHits.length < 2) continue;
    
    // Sort by column
    rowHits.sort((a, b) => a[1] - b[1]);
    
    // Find consecutive sequences
    let start = 0;
    for (let i = 1; i <= rowHits.length; i++) {
      // Check if current hit is consecutive to previous or we're at the end
      if (i === rowHits.length || rowHits[i][1] > rowHits[i-1][1] + 1) {
        // If we have at least 2 consecutive hits, add them
        if (i - start >= 2) {
          result.push({
            direction: 'horizontal',
            coordinates: rowHits.slice(start, i)
          });
        }
        start = i;
      }
    }
  }
  
  // Find consecutive hits in columns
  for (const [col, colHits] of hitsByCol.entries()) {
    if (colHits.length < 2) continue;
    
    // Sort by row
    colHits.sort((a, b) => a[0] - b[0]);
    
    // Find consecutive sequences
    let start = 0;
    for (let i = 1; i <= colHits.length; i++) {
      // Check if current hit is consecutive to previous or we're at the end
      if (i === colHits.length || colHits[i][0] > colHits[i-1][0] + 1) {
        // If we have at least 2 consecutive hits, add them
        if (i - start >= 2) {
          result.push({
            direction: 'vertical',
            coordinates: colHits.slice(start, i)
          });
        }
        start = i;
      }
    }
  }
  
  return result;
}

/**
 * Gets potential extension points for a line of hits
 * 
 * @param coordinates - Aligned hit coordinates
 * @param direction - Direction of alignment ('horizontal' or 'vertical')
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param misses - Coordinates of cells that have been missed
 * @returns Array of extension coordinates
 */
function getExtensionPoints(
  coordinates: Coordinate[],
  direction: 'horizontal' | 'vertical',
  boardHeight: number,
  boardWidth: number,
  misses: Coordinate[]
): Coordinate[] {
  const extensions: Coordinate[] = [];
  
  if (direction === 'horizontal') {
    // Sort by column
    coordinates.sort((a, b) => a[1] - b[1]);
    
    const row = coordinates[0][0];
    const minCol = coordinates[0][1];
    const maxCol = coordinates[coordinates.length - 1][1];
    
    // Check left extension
    if (minCol > 0) {
      const leftExtension: Coordinate = [row, minCol - 1];
      if (!isCoordinateInList(leftExtension, misses)) {
        extensions.push(leftExtension);
      }
    }
    
    // Check right extension
    if (maxCol < boardWidth - 1) {
      const rightExtension: Coordinate = [row, maxCol + 1];
      if (!isCoordinateInList(rightExtension, misses)) {
        extensions.push(rightExtension);
      }
    }
  } else {
    // Sort by row
    coordinates.sort((a, b) => a[0] - b[0]);
    
    const col = coordinates[0][1];
    const minRow = coordinates[0][0];
    const maxRow = coordinates[coordinates.length - 1][0];
    
    // Check top extension
    if (minRow > 0) {
      const topExtension: Coordinate = [minRow - 1, col];
      if (!isCoordinateInList(topExtension, misses)) {
        extensions.push(topExtension);
      }
    }
    
    // Check bottom extension
    if (maxRow < boardHeight - 1) {
      const bottomExtension: Coordinate = [maxRow + 1, col];
      if (!isCoordinateInList(bottomExtension, misses)) {
        extensions.push(bottomExtension);
      }
    }
  }
  
  return extensions;
}

/**
 * Identifies cells that are adjacent to known hits and not already hit or missed
 * 
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 * @returns Array of coordinates that are adjacent to hits
 */
function getAdjacentCells(
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[]
): Coordinate[] {
  const adjacentCells: Coordinate[] = [];

  // For each hit, check its adjacent cells
  for (const [hitRow, hitCol] of hits) {
    for (const [dx, dy] of ADJACENT_DIRECTIONS) {
      const adjRow = hitRow + dx;
      const adjCol = hitCol + dy;
      
      // Check if the adjacent cell is within the board
      if (adjRow >= 0 && adjRow < boardHeight && adjCol >= 0 && adjCol < boardWidth) {
        const adjCoord: Coordinate = [adjRow, adjCol];
        
        // Check if the cell is not already a hit or miss and not already in our list
        if (!isCoordinateInList(adjCoord, hits) && 
            !isCoordinateInList(adjCoord, misses) && 
            !isCoordinateInList(adjCoord, adjacentCells)) {
          adjacentCells.push(adjCoord);
        }
      }
    }
  }

  return adjacentCells;
}

/**
 * Generates all valid placements for a ship of a given length
 * 
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param shipLength - Length of the ship
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 * @param sunkShips - Array of ships that have been sunk
 * @returns Array of valid ship placements (each placement is an array of coordinates)
 */
function generateValidPlacements(
  boardHeight: number,
  boardWidth: number,
  shipLength: number,
  hits: Coordinate[],
  misses: Coordinate[],
  sunkShips: SunkShip[] = [] // Kept for potential future use, but not for exclusion
): Coordinate[][] {
  const validPlacements: Coordinate[][] = [];

  // Try all possible positions and orientations
  // Horizontal placements
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col <= boardWidth - shipLength; col++) {
      const placement: Coordinate[] = [];
      let isValid = true;

      // Generate the placement
      for (let i = 0; i < shipLength; i++) {
        const coord: Coordinate = [row, col + i];
        
        // Check if this coordinate is a miss - if so, the placement is invalid
        if (isCoordinateInList(coord, misses)) {
          isValid = false;
          break;
        }
        
        placement.push(coord);
      }

      // Check if the placement is consistent with known hits
      if (isValid && isConsistentWithHits(placement, hits)) {
        validPlacements.push(placement);
      }
    }
  }

  // Vertical placements
  for (let row = 0; row <= boardHeight - shipLength; row++) {
    for (let col = 0; col < boardWidth; col++) {
      const placement: Coordinate[] = [];
      let isValid = true;

      // Generate the placement
      for (let i = 0; i < shipLength; i++) {
        const coord: Coordinate = [row + i, col];
        
        // Check if this coordinate is a miss - if so, the placement is invalid
        if (isCoordinateInList(coord, misses)) {
          isValid = false;
          break;
        }
        
        placement.push(coord);
      }

      // Check if the placement is consistent with known hits
      if (isValid && isConsistentWithHits(placement, hits)) {
        validPlacements.push(placement);
      }
    }
  }

  return validPlacements;
}

/**
 * Checks if a placement is consistent with the known hits
 * A placement is consistent if it either contains all hits that would intersect with it,
 * or contains none of them (allowing for multiple ships)
 * 
 * @param placement - Array of coordinates representing a ship placement
 * @param hits - Array of coordinates where hits have been recorded
 * @returns True if the placement is consistent with the hits, false otherwise
 */
function isConsistentWithHits(placement: Coordinate[], hits: Coordinate[]): boolean {
  // Find hits that overlap with this placement
  const overlappingHits = hits.filter(hit => isCoordinateInList(hit, placement));
  
  // If there are no overlapping hits, the placement is valid
  if (overlappingHits.length === 0) {
    return true;
  }
  
  // If there are overlapping hits, they must form a contiguous section of the ship
  // Sort the overlapping hits by their position in the placement
  const placementIndices = overlappingHits.map(hit => {
    for (let i = 0; i < placement.length; i++) {
      if (placement[i][0] === hit[0] && placement[i][1] === hit[1]) {
        return i;
      }
    }
    return -1;
  });
  
  // Sort indices
  placementIndices.sort((a, b) => a - b);
  
  // Check if the indices are contiguous
  for (let i = 1; i < placementIndices.length; i++) {
    if (placementIndices[i] !== placementIndices[i-1] + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Helper function to check if a coordinate is in a list of coordinates
 * 
 * @param coord - The coordinate to check
 * @param list - The list of coordinates to check against
 * @returns True if the coordinate is in the list, false otherwise
 */
function isCoordinateInList(coord: Coordinate, list: Coordinate[]): boolean {
  return list.some(item => item[0] === coord[0] && item[1] === coord[1]);
}

/**
 * Creates a visual representation of the probability map
 * 
 * @param probabilityMap - The probability map to visualize
 * @returns A string representation of the probability map
 */
export function visualizeProbabilityMap(probabilityMap: ProbabilityMap): string {
  const rows = probabilityMap.length;
  const cols = probabilityMap[0].length;
  
  let output = '   ';
  
  // Column headers
  for (let c = 0; c < cols; c++) {
    output += ` ${c.toString().padStart(4)} `;
  }
  output += '\n';
  
  // Separator
  output += '   ' + '------'.repeat(cols) + '\n';
  
  // Rows
  for (let r = 0; r < rows; r++) {
    output += `${r.toString().padStart(2)} |`;
    
    for (let c = 0; c < cols; c++) {
      // Format the probability as a percentage with 1 decimal place
      const probPercent = (probabilityMap[r][c] * 100).toFixed(1);
      output += ` ${probPercent.padStart(4)}% |`;
    }
    
    output += '\n';
    output += '   ' + '------'.repeat(cols) + '\n';
  }
  
  return output;
}

/**
 * Applies an optimized strategy that aims to find all ships in the minimum number of steps
 * Uses a combination of targeting, pattern recognition, and information entropy
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 * @param remainingShips - Array of ships that have not been sunk yet
 * @param sunkShips - Array of ships that have been sunk
 */
function applyOptimizedStrategy(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[],
  remainingShips: number[],
  sunkShips: SunkShip[] = []
): void {
  // Filter out hits that are part of sunk ships to focus on active hits
  const activeHits = getActiveHits(hits, sunkShips);
  
  // If no active hits, start with an optimal initial search pattern
  if (activeHits.length === 0) {
    applyOptimalInitialPattern(probabilityMap, boardHeight, boardWidth, remainingShips);
    return;
  }
  
  // Check if we have multiple hits in a row or column
  const alignedHits = findAlignedHits(activeHits);
  
  if (alignedHits.length >= 1) {
    // We have aligned hits, very strongly focus on extending these lines
    // Apply to all aligned groups to handle multiple partial ships
    for (const {direction, coordinates} of alignedHits) {
      // Get potential extension points
      const extensions = getExtensionPoints(coordinates, direction, boardHeight, boardWidth, misses);
      
      // Extremely boost probabilities for extension points
      for (const [row, col] of extensions) {
        if (probabilityMap[row][col] > 0) {
          probabilityMap[row][col] *= OPTIMIZED_ALIGNMENT_FACTOR;
        }
      }
    }
  }
  
  // For any isolated active hits (not part of aligned groups), focus very heavily on adjacent cells
  const isolatedHits = activeHits.filter(hit => 
    !alignedHits.some(group => 
      group.coordinates.some(coord => coord[0] === hit[0] && coord[1] === hit[1])
    )
  );
  
  if (isolatedHits.length > 0) {
    const adjacentCells = getAdjacentCells(boardHeight, boardWidth, isolatedHits, misses);
    
    for (const [row, col] of adjacentCells) {
      // Strongly boost probabilities for cells adjacent to isolated hits
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= OPTIMIZED_ADJACENCY_FACTOR;
      }
    }
  }
  
  // Check for potential completions (cells that would complete a ship)
  const completions = findPotentialCompletions(
    boardHeight, 
    boardWidth, 
    activeHits, 
    misses, 
    findSmallestRemainingShip(probabilityMap, boardHeight, boardWidth)
  );
  
  // Strongly boost probabilities for potential completions
  for (const [row, col] of completions) {
    if (probabilityMap[row][col] > 0) {
      probabilityMap[row][col] *= OPTIMIZED_COMPLETION_FACTOR;
    }
  }
  
  // Look for patterns that might indicate ship positions
  applyEnhancedPatternRecognition(probabilityMap, boardHeight, boardWidth, activeHits, misses);
  
  // Apply information entropy as a secondary factor
  applyInformationEntropy(probabilityMap, boardHeight, boardWidth, hits, misses, remainingShips);
}

/**
 * Applies an optimal initial search pattern based on the sizes of ships remaining
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param remainingShips - Array of remaining ship lengths
 */
function applyOptimalInitialPattern(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  remainingShips: number[]
): void {
  // Calculate maximum ship size
  const maxShipSize = Math.max(...remainingShips);
  
  // For a 10x10 board with standard ships, a pattern with evenly spaced shots is optimal
  // The optimal spacing is related to the size of the smallest ship (usually 2)
  const smallestShip = Math.min(...remainingShips);
  const optimalSpacing = Math.max(2, smallestShip - 1);
  
  // Apply an optimized grid pattern that guarantees a hit on any ship
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      if ((row % optimalSpacing === 0 && col % optimalSpacing === 0) || 
          (row % optimalSpacing === 1 && col % optimalSpacing === 1)) {
        // Boost these cells to create our optimal search pattern
        probabilityMap[row][col] *= 2.0;
      }
    }
  }
  
  // For a standard 10x10 board, certain key cells have higher likelihood
  // Corner avoidance - ships are less likely to be placed in corners
  if (boardHeight === 10 && boardWidth === 10) {
    const cornerAreas = [
      [0, 0], [0, 1], [1, 0], 
      [0, boardWidth-1], [0, boardWidth-2], [1, boardWidth-1],
      [boardHeight-1, 0], [boardHeight-2, 0], [boardHeight-1, 1],
      [boardHeight-1, boardWidth-1], [boardHeight-1, boardWidth-2], [boardHeight-2, boardWidth-1]
    ];
    
    for (const [row, col] of cornerAreas) {
      if (probabilityMap[row][col] > 0) {
        probabilityMap[row][col] *= 0.5; // Reduce probability in corners
      }
    }
    
    // Center focus - the center of the board is often a strategic choice
    const centerRow = Math.floor(boardHeight / 2);
    const centerCol = Math.floor(boardWidth / 2);
    
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (r >= 0 && r < boardHeight && c >= 0 && c < boardWidth && probabilityMap[r][c] > 0) {
          probabilityMap[r][c] *= 1.25; // Slightly boost center area
        }
      }
    }
  }
}

/**
 * Applies information entropy to prioritize cells that would provide the most information
 * for subsequent shots. This helps to minimize the total number of shots needed.
 * 
 * @param probabilityMap - The probability map to modify
 * @param boardHeight - Height of the board
 * @param boardWidth - Width of the board
 * @param hits - Coordinates of cells that have been hit
 * @param misses - Coordinates of cells that have been missed
 * @param remainingShips - Array of remaining ship lengths
 */
function applyInformationEntropy(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[],
  remainingShips: number[]
): void {
  // Skip if we have strong alignment hints already
  if (findAlignedHits(hits).length >= 2) return;
  
  const entropyMap: number[][] = Array(boardHeight)
    .fill(0)
    .map(() => Array(boardWidth).fill(0));
  
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      if (probabilityMap[row][col] === 0) continue;
      
      // Calculate how much information would be gained by attacking this cell
      // Cells that would eliminate more potential ship placements provide more information
      let informationGain = 0;
      
      // Check how many valid ship placements go through this cell
      for (const shipLength of remainingShips) {
        // Check horizontal placements through this cell
        for (let i = Math.max(0, col - shipLength + 1); i <= col && i + shipLength - 1 < boardWidth; i++) {
          let isValidPlacement = true;
          for (let j = i; j < i + shipLength; j++) {
            if (j === col) continue; // Skip the current cell
            
            // If this cell is a known miss, the placement is invalid
            if (isCoordinateInList([row, j], misses)) {
              isValidPlacement = false;
              break;
            }
          }
          
          if (isValidPlacement) {
            informationGain++;
          }
        }
        
        // Check vertical placements through this cell
        for (let i = Math.max(0, row - shipLength + 1); i <= row && i + shipLength - 1 < boardHeight; i++) {
          let isValidPlacement = true;
          for (let j = i; j < i + shipLength; j++) {
            if (j === row) continue; // Skip the current cell
            
            // If this cell is a known miss, the placement is invalid
            if (isCoordinateInList([j, col], misses)) {
              isValidPlacement = false;
              break;
            }
          }
          
          if (isValidPlacement) {
            informationGain++;
          }
        }
      }
      
      entropyMap[row][col] = informationGain;
    }
  }
  
  // Normalize the entropy map
  const maxEntropy = Math.max(...entropyMap.flatMap(row => row));
  if (maxEntropy > 0) {
    for (let row = 0; row < boardHeight; row++) {
      for (let col = 0; col < boardWidth; col++) {
        entropyMap[row][col] /= maxEntropy;
      }
    }
  }
  
  // Apply entropy adjustment to the probability map
  for (let row = 0; row < boardHeight; row++) {
    for (let col = 0; col < boardWidth; col++) {
      if (probabilityMap[row][col] > 0) {
        // Use a weighted combination of probability and entropy
        probabilityMap[row][col] = (1 - ENTROPY_WEIGHT) * probabilityMap[row][col] + 
                                   ENTROPY_WEIGHT * entropyMap[row][col];
      }
    }
  }
}

/**
 * Enhanced pattern recognition that more strongly prioritizes the cross pattern around hits
 */
function applyEnhancedPatternRecognition(
  probabilityMap: ProbabilityMap,
  boardHeight: number,
  boardWidth: number,
  hits: Coordinate[],
  misses: Coordinate[]
): void {
  // Prioritize the "+" pattern around isolated hits
  for (const [hitRow, hitCol] of hits) {
    // Check all 4 directions from the hit
    for (const [dx, dy] of ADJACENT_DIRECTIONS) {
      const adjRow = hitRow + dx;
      const adjCol = hitCol + dy;
      
      // Check if valid cell and not hit or missed
      if (isValidCell(adjRow, adjCol, boardHeight, boardWidth) && 
          !isCoordinateInList([adjRow, adjCol], hits) && 
          !isCoordinateInList([adjRow, adjCol], misses)) {
        
        // Apply an additional boost to the cross pattern
        if (probabilityMap[adjRow][adjCol] > 0) {
          probabilityMap[adjRow][adjCol] *= 2.0;
        }
      }
    }
  }
  
  // Look for corner patterns: if two or more hits form an L or T shape,
  // prioritize the connecting cell at the corner
  for (const hit1 of hits) {
    for (const hit2 of hits) {
      // Skip if same hit
      if (hit1[0] === hit2[0] && hit1[1] === hit2[1]) continue;
      
      // Check if they share a row or column
      if (hit1[0] === hit2[0] || hit1[1] === hit2[1]) continue;
      
      // They form a potential corner, check the corner cells
      const corner1: Coordinate = [hit1[0], hit2[1]];
      const corner2: Coordinate = [hit2[0], hit1[1]];
      
      // If the corner is valid and not already hit or missed, boost it
      if (isValidCell(corner1[0], corner1[1], boardHeight, boardWidth) && 
          !isCoordinateInList(corner1, hits) && 
          !isCoordinateInList(corner1, misses)) {
        probabilityMap[corner1[0]][corner1[1]] *= OPTIMIZED_PATTERN_FACTOR;
      }
      
      if (isValidCell(corner2[0], corner2[1], boardHeight, boardWidth) && 
          !isCoordinateInList(corner2, hits) && 
          !isCoordinateInList(corner2, misses)) {
        probabilityMap[corner2[0]][corner2[1]] *= OPTIMIZED_PATTERN_FACTOR;
      }
    }
  }
}

// Add a new function to separate active hits from hits on sunk ships
export function getActiveHits(
  hits: Coordinate[],
  sunkShips: SunkShip[]
): Coordinate[] {
  // Extract all positions of sunk ships
  const sunkPositions: Coordinate[] = [];
  for (const ship of sunkShips) {
    sunkPositions.push(...ship.positions);
  }
  
  // Filter out hits that are part of sunk ships
  return hits.filter(hit => 
    !sunkPositions.some(sunkPos => 
      sunkPos[0] === hit[0] && sunkPos[1] === hit[1]
    )
  );
}

/**
 * Analyzes hit patterns to identify possible ship orientations
 * 
 * @param hits - Coordinates of cells that have been hit
 * @param sunkShips - Array of ships that have been sunk
 * @returns Object with potential ship orientations
 */
export function analyzeHitPatterns(
  hits: Coordinate[],
  sunkShips: SunkShip[] = []
): { 
  alignedGroups: Array<{direction: 'horizontal' | 'vertical', coordinates: Coordinate[]}>,
  isolatedHits: Coordinate[]
} {
  // Remove hits that are part of sunk ships
  const activeHits = hits.filter(hit => 
    !sunkShips.some(ship => 
      isCoordinateInList(hit, ship.positions)
    )
  );
  
  // Find aligned groups among active hits
  const alignedGroups = findAlignedHits(activeHits);
  
  // Find isolated hits (not part of any aligned group)
  const isolatedHits = activeHits.filter(hit => 
    !alignedGroups.some(group => 
      isCoordinateInList(hit, group.coordinates)
    )
  );
  
  return { alignedGroups, isolatedHits };
}

/**
 * Example usage:
 * 
 * const boardHeight = 10;
 * const boardWidth = 10;
 * const hits: Coordinate[] = [[2, 3], [2, 4]]; // Hits at (2,3) and (2,4)
 * const misses: Coordinate[] = [[0, 0], [1, 1], [3, 3]]; // Misses at (0,0), (1,1), and (3,3)
 * const remainingShips = [5, 4, 3]; // Ships of length 5, 4, and 3 still remain
 * 
 * const probMap = calculateProbabilityMap(boardHeight, boardWidth, hits, misses, remainingShips);
 * console.log(visualizeProbabilityMap(probMap));
 */ 