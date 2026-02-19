import { Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { MultiplayerProvider } from './context/MultiplayerContext'
import ErrorBoundary from './components/ErrorBoundary'
import TitleScreen from './pages/TitleScreen'
import PackSelection from './pages/PackSelection'
import PlayerSetup from './pages/PlayerSetup'
import GameInitScreen from './pages/GameInitScreen'
import GameScreen from './pages/GameScreen'
import VictoryPage from './pages/VictoryPage'
import MultiplayerChoice from './pages/MultiplayerChoice'
import HostLobby from './pages/HostLobby'
import JoinGame from './pages/JoinGame'
import GuestController from './pages/GuestController'

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <MultiplayerProvider>
          <Routes>
            <Route path="/" element={<TitleScreen />} />
            <Route path="/packs" element={<PackSelection />} />
            <Route path="/setup" element={<PlayerSetup />} />
            <Route path="/deal" element={<GameInitScreen />} />
            <Route path="/play" element={<GameScreen />} />
            <Route path="/victory" element={<VictoryPage />} />
            <Route path="/multiplayer" element={<MultiplayerChoice />} />
            <Route path="/host" element={<HostLobby />} />
            <Route path="/join" element={<JoinGame />} />
            <Route path="/guest-play" element={<GuestController />} />
          </Routes>
        </MultiplayerProvider>
      </GameProvider>
    </ErrorBoundary>
  )
}
