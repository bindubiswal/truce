import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import CreateHouse from './pages/CreateHouse'
import ProposeRule from './pages/ProposeRule'
import Confirmation from './pages/Confirmation'
import HouseRules from './pages/HouseRules'
import RequireAuth from './components/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/create-house" element={<RequireAuth><CreateHouse /></RequireAuth>} />
      <Route path="/propose-rule" element={<RequireAuth><ProposeRule /></RequireAuth>} />
      <Route path="/confirmation/:ruleId" element={<RequireAuth><Confirmation /></RequireAuth>} />
      <Route path="/house" element={<RequireAuth><HouseRules /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
