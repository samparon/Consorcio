import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const toEmail = v => { const t = v.trim(); return t.includes('@') ? t : t.toLowerCase() + '@consorcio.app' }

export default function Setup() {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [feito, setFeito] = useState(false)

  async function criar(e) {
    e.preventDefault()
    setMsg('')
    try {
      const emailFinal = toEmail(login)
      let uid
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailFinal, senha)
        uid = cred.user.uid
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, emailFinal, senha)
          uid = cred.user.uid
        } else throw err
      }
      await setDoc(doc(db, 'usuarios', uid), {
        nome: login.trim(), login: login.trim(), role: 'admin', criadoEm: Date.now(),
      })
      setFeito(true)
      setMsg(`✅ Admin configurado! Use "${login.trim()}" para entrar.`)
    } catch (err) {
      setMsg('❌ Erro: ' + err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e3a8a', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 8 }}>⚙️ Setup Admin</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>Crie a conta de administrador. Use esta página apenas uma vez.</p>
        {!feito ? (
          <form onSubmit={criar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Login do admin</label>
              <input type="text" value={login} onChange={e => setLogin(e.target.value)} required autoCapitalize="none" placeholder="E-mail ou login simples (ex: gui)"
                style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {msg && <p style={{ fontSize: 14, color: '#dc2626' }}>{msg}</p>}
            <button type="submit" style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
              Criar admin
            </button>
          </form>
        ) : (
          <p style={{ fontSize: 15, color: '#16a34a', fontWeight: 600 }}>{msg}</p>
        )}
      </div>
    </div>
  )
}
