# Battleship Predictor

An advanced AI probability calculator for the classic Battleship game that predicts opponent ship locations and suggests optimal moves.

## Features

- **Probability Visualization**: Displays the probability of ships being present at each cell
- **Best Move Highlighting**: Highlights the cell with the highest probability for the next move
- **Multiple Difficulty Levels**: 
  - Normal: Standard probability calculation
  - Hard: Aggressive targeting strategy
  - Optimized: Advanced algorithm to find ships in the fewest possible steps
- **Ship Visualization**: Shows ship orientations and types with clear visual indicators
- **Developer Mode**: For testing the algorithm against randomly placed ships
- **Manual Mode**: For use in real games where you provide hit/miss feedback

## Live Demo

Check out the live demo: [Battleship Predictor](https://qchien643.github.io/battleship-resolve/)

## How It Works

The predictor uses several advanced algorithms to calculate probabilities:

1. **Valid Placement Analysis**: Checks all possible valid ship placements
2. **Pattern Recognition**: Identifies likely ship patterns based on hits
3. **Active Hit Targeting**: Focuses on partially hit ships that haven't been sunk
4. **Cross-Pattern Search**: Prioritizes the "+" pattern around hit cells
5. **Information Entropy**: Selects cells that provide the most information

## Technologies Used

- React
- TypeScript
- Vite

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:5173` (or the port specified in the console) to use the application.

## Deployment

```bash
# Deploy to GitHub Pages
npm run deploy
```

The site will be deployed to https://qchien643.github.io/battleship-resolve/

Alternatively, the site is automatically deployed via GitHub Actions when changes are pushed to the main branch.

## Usage

1. Start by configuring the grid size and ships in the setup screen
2. Choose between Developer Mode (for testing) and Normal Mode (for real games)
3. In Developer Mode, ships are randomly placed and you can reveal their positions
4. In Normal Mode, you'll select cells and provide hit/miss feedback manually
5. The probability map will update based on your feedback
6. Follow the highlighted best move for the optimal strategy

## License

MIT 