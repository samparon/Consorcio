import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { auth, db } from '../firebase'
import { LogOut, UserPlus, CheckCircle, Circle, Users, DollarSign, Calendar, PlusCircle } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const VALOR_COTA = 100

export default function Admin() {
  const [aba, setAba] = useState('visao')
  const [participantes, setParticipantes] = useState([])
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criando, setCriando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const snap = await getDocs(collection(db, 'usuarios'))
    const lista = []
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }))
    lista.sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0))
    setParticipantes(lista)
  }

  async function criarUsuario(e) {
    e.preventDefault()
    setMsg('')
    setCriando(true)
    try {
      const app2 = initializeApp(auth.app.options, 'secondary-' + Date.now())
      const auth2 = getAuth(app2)
      const cred = await createUserWithEmailAndPassword(auth2, email, senha)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nome, email, role: 'participante',
        criadoEm: Date.now(), cotas: 0, mesesEscolhidos: [], pagamentos: [],
      })
      await auth2.signOut()
      setMsg('✅ Usuário criado com sucesso!')
      setNome(''); setEmail(''); setSenha('')
      await carregar()
    } catch (err) {
      setMsg('❌ ' + (err.code === 'auth/email-already-in-use' ? 'E-mail já cadastrado.' : err.message))
    } finally {
      setCriando(false)
    }
  }

  async function marcarPagamento(userId, mes) {
    const p = participantes.find(u => u.id === userId)
    if (!p) return
    const pagamentos = p.pagamentos || []
    const novos = pagamentos.includes(mes) ? pagamentos.filter(m => m !== mes) : [...pagamentos, mes]
    await updateDoc(doc(db, 'usuarios', userId), { pagamentos: novos })
    await carregar()
  }

  const membros = participantes.filter(p => p.role !== 'admin')
  const totalCotas = membros.reduce((acc, p) => acc + (Number(p.cotas) || 0), 0)
  const potMensal = totalCotas * VALOR_COTA
  const totalMeses = totalCotas

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }} className="px-8 py-5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 28 }}>💰</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Consórcio</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>Admin</span>
        </div>
        <button onClick={() => signOut(auth)} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none' }}>
          <LogOut size={18} /> Sair
        </button>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { icon: <Users size={28} />, label: 'Participantes', value: membros.length, color: '#1d4ed8', bg: '#eff6ff' },
            { icon: <DollarSign size={28} />, label: 'Total de cotas', value: totalCotas, color: '#7c3aed', bg: '#f5f3ff' },
            { icon: <Calendar size={28} />, label: 'Pot mensal', value: fmt(potMensal), color: 'white', bg: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', white: true },
          ].map(({ icon, label, value, color, bg, white }) => (
            <div key={label} style={{ background: bg, borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ color: white ? 'white' : color }}>{icon}</div>
              <div>
                <p style={{ fontSize: 14, color: white ? 'rgba(255,255,255,0.8)' : '#6b7280', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: white ? 'white' : color }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['visao', 'Visão geral'], ['usuarios', 'Participantes'], ['novo', 'Novo usuário']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} style={{
              padding: '10px 22px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: aba === id ? '#1d4ed8' : 'white',
              color: aba === id ? 'white' : '#374151',
              boxShadow: aba === id ? '0 4px 12px rgba(29,78,216,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
            }}>{label}</button>
          ))}
        </div>

        {/* Visão geral */}
        {aba === 'visao' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Calendário do consórcio</h2>
            {totalMeses === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 16 }}>Nenhum participante configurou cotas ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                  const dono = membros.find(p => p.mesesEscolhidos?.includes(mes))
                  return (
                    <div key={mes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #f3f4f6', borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mes}</div>
                        <div>
                          <p style={{ fontSize: 17, fontWeight: 700, color: dono ? '#111827' : '#9ca3af' }}>{dono ? dono.nome : 'Mês livre'}</p>
                          {dono && <p style={{ fontSize: 13, color: '#6b7280' }}>{dono.email}</p>}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmt(potMensal)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Participantes */}
        {aba === 'usuarios' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Participantes</h2>
            {membros.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 16 }}>Nenhum participante cadastrado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {membros.map((p, idx) => (
                  <div key={p.id} style={{ border: '2px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{idx + 1}º — {p.nome}</p>
                        <p style={{ fontSize: 14, color: '#6b7280' }}>{p.email}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{p.cotas || 0} cota{p.cotas !== 1 ? 's' : ''}</p>
                        <p style={{ fontSize: 13, color: '#6b7280' }}>{fmt((p.cotas || 0) * VALOR_COTA)}/mês</p>
                      </div>
                    </div>
                    {p.cotas > 0 ? (
                      <div>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>Clique para marcar pagamento recebido:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {p.mesesEscolhidos?.sort((a, b) => a - b).map(mes => {
                            const pago = p.pagamentos?.includes(mes)
                            return (
                              <button key={mes} onClick={() => marcarPagamento(p.id, mes)} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                border: `2px solid ${pago ? '#16a34a' : '#e5e7eb'}`,
                                background: pago ? '#f0fdf4' : '#f9fafb', color: pago ? '#16a34a' : '#374151',
                              }}>
                                {pago ? <CheckCircle size={15} /> : <Circle size={15} />} Mês {mes}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, color: '#d97706', background: '#fffbeb', padding: '8px 14px', borderRadius: 8 }}>Ainda não configurou as cotas.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Novo usuário */}
        {aba === 'novo' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 480 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={22} /> Criar novo usuário
            </h2>
            <form onSubmit={criarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Nome completo', value: nome, set: setNome, type: 'text', ph: 'João Silva' },
                { label: 'E-mail', value: email, set: setEmail, type: 'email', ph: 'joao@email.com' },
                { label: 'Senha', value: senha, set: setSenha, type: 'password', ph: 'Mínimo 6 caracteres' },
              ].map(({ label, value, set, type, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{label}</label>
                  <input type={type} value={value} onChange={e => set(e.target.value)} required placeholder={ph}
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none', color: '#111827' }} />
                </div>
              ))}
              {msg && <p style={{ fontSize: 15, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</p>}
              <button type="submit" disabled={criando} style={{
                background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: criando ? 0.6 : 1,
              }}>
                {criando ? 'Criando...' : '+ Criar usuário'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
