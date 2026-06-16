import { AuthProvider, useAuth } from './context/AuthContext'
import Setup from './pages/Setup'
import Login from './pages/Login'
import AdminHome from './pages/admin/AdminHome'
import AdminConsorcio from './pages/admin/AdminConsorcio'
import ParticipanteHome from './pages/participante/ParticipanteHome'
import ParticipanteConsorcio from './pages/participante/ParticipanteConsorcio'
import { useState } from 'react'
import './index.css'

export const NavContext = { setView: null, setConsorcioId: null }

function Router() {
  const { user, perfil, loading } = useAuth()
  const [view, setView] = useState('home')
  const [consorcioId, setConsorcioId] = useState(null)

  NavContext.setView = setView
  NavContext.setConsorcioId = setConsorcioId

  if (window.location.hash === '#/setup') return <Setup />

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <p style={{ color: '#6b7280', fontSize: 18 }}>Carregando...</p>
      </div>
    )
  }

  if (!user) return <Login />

  if (perfil?.role === 'admin') {
    if (view === 'consorcio' && consorcioId) return <AdminConsorcio consorcioId={consorcioId} onVoltar={() => setView('home')} />
    return <AdminHome onEntrar={id => { setConsorcioId(id); setView('consorcio') }} />
  }

  if (view === 'consorcio' && consorcioId) return <ParticipanteConsorcio consorcioId={consorcioId} onVoltar={() => setView('home')} />
  return <ParticipanteHome onEntrar={id => { setConsorcioId(id); setView('consorcio') }} />
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}
