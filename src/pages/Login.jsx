import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch {
      setErro('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', padding: '56px 64px', width: '100%', maxWidth: 680 }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💰</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#111827', margin: 0 }}>Consórcio Digital</h1>
          <p style={{ fontSize: 18, color: '#6b7280', marginTop: 10 }}>Entre com sua conta para continuar</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 10 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', fontSize: 17, outline: 'none', color: '#111827', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 14, padding: '16px 20px', fontSize: 17, outline: 'none', color: '#111827', boxSizing: 'border-box' }}
            />
          </div>

          {erro && (
            <div style={{ background: '#fef2f2', border: '2px solid #fecaca', color: '#dc2626', fontSize: 16, padding: '14px 18px', borderRadius: 12 }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              color: 'white', border: 'none', borderRadius: 14,
              padding: '18px', fontSize: 19, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 8px 24px rgba(29,78,216,0.35)',
              marginTop: 8,
            }}>
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 15, color: '#9ca3af', marginTop: 32 }}>
          Não tem acesso? Fale com o administrador.
        </p>
      </div>
    </div>
  )
}
