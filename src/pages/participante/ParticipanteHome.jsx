import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { LogOut, ChevronRight } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ParticipanteHome({ onEntrar }) {
  const { user, perfil } = useAuth()
  const [consorcios, setConsorcios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [user])

  async function carregar() {
    if (!user) return
    const uSnap = await getDoc(doc(db, 'usuarios', user.uid))
    const ids = uSnap.data()?.consorcios || []
    const lista = []
    for (const id of ids) {
      const cSnap = await getDoc(doc(db, 'consorcios', id))
      if (!cSnap.exists()) continue
      const mSnap = await getDoc(doc(db, 'consorcios', id, 'membros', user.uid))
      lista.push({ id, ...cSnap.data(), membro: mSnap.exists() ? mSnap.data() : {} })
    }
    setConsorcios(lista)
    setLoading(false)

    // Auto-redireciona se tiver só 1
    if (lista.length === 1) onEntrar(lista[0].id)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
      <p style={{ color: '#6b7280', fontSize: 18 }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>💰</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Consórcio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>Olá, <strong>{perfil?.nome || user?.email}</strong></span>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.75)', fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Meus Consórcios</h1>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32 }}>Selecione um consórcio para acessar.</p>

        {consorcios.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 20, padding: '48px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <p style={{ fontSize: 18, color: '#6b7280' }}>Você ainda não está em nenhum consórcio.</p>
            <p style={{ fontSize: 15, color: '#9ca3af', marginTop: 4 }}>Fale com o administrador para ser adicionado.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {consorcios.map(c => {
              const pot = (c.totalCotasPlano || 12) * (c.valorCota || 100)
              return (
                <div key={c.id} onClick={() => onEntrar(c.id)} style={{
                  background: 'white', borderRadius: 20, padding: '24px 28px', cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: '2px solid transparent',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💰</div>
                    <div>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{c.nome}</p>
                      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                        {c.membro?.cotas || 0} cota{c.membro?.cotas !== 1 ? 's' : ''} · {fmt((c.membro?.cotas || 0) * (c.valorCota || 100))}/mês · Pot: {fmt(pot)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} color="#9ca3af" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
