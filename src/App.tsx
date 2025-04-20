import React from 'react';
import BattleshipGame from './components/BattleshipGame';
import './styles/styles.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <BattleshipGame />
    </div>
  );
};

export default App; 