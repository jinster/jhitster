import { Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import TitleScreen from './pages/TitleScreen'
import PlayerSetup from './pages/PlayerSetup'
import GameInitScreen from './pages/GameInitScreen'
import GameScreen from './pages/GameScreen'
import VictoryPage from './pages/VictoryPage'

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<TitleScreen />} />
        <Route path="/setup" element={<PlayerSetup />} />
        <Route path="/deal" element={<GameInitScreen />} />
        <Route path="/play" element={<GameScreen />} />
        <Route path="/victory" element={<VictoryPage />} />
      </Routes>
    </GameProvider>
  )
}
