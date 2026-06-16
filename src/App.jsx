import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Participante from './pages/Participante'
import './index.css'

function Router() {
  const { user, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (!user) return <Login />
  if (perfil?.role === 'admin') return <Admin />
  return <Participante />
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}
