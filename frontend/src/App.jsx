import { useApp } from './context/AppContext'
import AuthScreen from './screens/AuthScreen'
import DashboardScreen from './screens/DashboardScreen'
import LogScreen from './screens/LogScreen'
import HistoryScreen from './screens/HistoryScreen'
import TabBar from './components/TabBar'

export default function App() {
  const { user, tab } = useApp()

  if (!user) return <AuthScreen />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'log'       && <LogScreen />}
        {tab === 'history'   && <HistoryScreen />}
      </div>
      <TabBar />
    </div>
  )
}
