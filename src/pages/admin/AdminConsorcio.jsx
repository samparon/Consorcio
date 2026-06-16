import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, collection, getDocs, updateDoc, getDoc, arrayUnion } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { auth, db } from '../../firebase'
import { LogOut, UserPlus, CheckCircle, Circle, ArrowLeft, Users, DollarSign, Calendar } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AdminConsorcio({ consorcioId, onVoltar }) {
  const [consorcio, setConsorcio] = useState(null)
  const [membros, setMembros] = useState([])
  const [aba, setAba] = useState('visao')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criando, setCriando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [consorcioId])

  async function carregar() {
    const cSnap = await getDoc(doc(db, 'consorcios', consorcioId))
    if (!cSnap.exists()) return
    setConsorcio({ id: cSnap.id, ...cSnap.data() })

    const mSnap = await getDocs(collection(db, 'consorcios', consorcioId, 'membros'))
    const lista = []
    for (const m of mSnap.docs) {
      const uSnap = await getDoc(doc(db, 'usuarios', m.id))
      lista.push({ id: m.id, ...m.data(), perfil: uSnap.data() })
    }
    lista.sort((a, b) => (a.entradaEm || 0) - (b.entradaEm || 0))
    setMembros(lista)
  }

  async function criarUsuario(e) {
    e.preventDefault()
    setMsg('')
    setCriando(true)
    try {
      const app2 = initializeApp(auth.app.options, 'sec-' + Date.now())
      const auth2 = getAuth(app2)
      const cred = await createUserWithEmailAndPassword(auth2, email, senha)
      const uid = cred.user.uid

      // Cria/atualiza usuário global
      const uSnap = await getDoc(doc(db, 'usuarios', uid))
      if (!uSnap.exists()) {
        await setDoc(doc(db, 'usuarios', uid), {
          nome, email, role: 'participante', criadoEm: Date.now(), consorcios: [consorcioId],
        })
      } else {
        await updateDoc(doc(db, 'usuarios', uid), { consorcios: arrayUnion(consorcioId) })
      }

      // Cria membro no consórcio
      await setDoc(doc(db, 'consorcios', consorcioId, 'membros', uid), {
        cotas: 0, mesesEscolhidos: [], pagamentos: [], pagamentosMensais: [], entradaEm: Date.now(),
      })

      await auth2.signOut()
      setMsg('✅ Participante adicionado!')
      setNome(''); setEmail(''); setSenha('')
      await carregar()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setMsg('❌ E-mail já existe. Use "Adicionar existente" para adicioná-lo a este consórcio.')
      } else {
        setMsg('❌ ' + err.message)
      }
    } finally {
      setCriando(false)
    }
  }

  async function marcarPagamento(uid, mes) {
    const m = membros.find(x => x.id === uid)
    if (!m) return
    const pagamentos = m.pagamentos || []
    const novos = pagamentos.includes(mes) ? pagamentos.filter(x => x !== mes) : [...pagamentos, mes]
    await updateDoc(doc(db, 'consorcios', consorcioId, 'membros', uid), { pagamentos: novos })
    await carregar()
  }

  if (!consorcio) return <div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>

  const totalCotasPlano = consorcio.totalCotasPlano || 12
  const valorCota = consorcio.valorCota || 100
  const potMensal = totalCotasPlano * valorCota
  const totalCotasRegistradas = membros.reduce((acc, m) => acc + (Number(m.cotas) || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onVoltar} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>|</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>💰 {consorcio.nome}</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Admin</span>
        </div>
        <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
          <LogOut size={18} /> Sair
        </button>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Participantes', value: membros.length, color: '#1d4ed8', bg: '#eff6ff' },
            { label: `Cotas (${totalCotasRegistradas}/${totalCotasPlano})`, value: `${totalCotasRegistradas}/${totalCotasPlano}`, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Valor/cota', value: fmt(valorCota), color: '#0369a1', bg: '#f0f9ff' },
            { label: 'Pot mensal', value: fmt(potMensal), color: 'white', bg: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', white: true },
          ].map(({ label, value, color, bg, white }) => (
            <div key={label} style={{ background: bg, borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 13, color: white ? 'rgba(255,255,255,0.75)' : '#6b7280', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: white ? 'white' : color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['visao', 'Calendário'], ['membros', 'Participantes'], ['novo', 'Novo participante']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} style={{
              padding: '11px 22px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: aba === id ? '#1d4ed8' : 'white', color: aba === id ? 'white' : '#374151',
              boxShadow: aba === id ? '0 4px 12px rgba(29,78,216,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
            }}>{label}</button>
          ))}
        </div>

        {/* Calendário */}
        {aba === 'visao' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Calendário — {consorcio.nome}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: totalCotasPlano }, (_, i) => i + 1).map(mes => {
                const dono = membros.find(m => m.mesesEscolhidos?.includes(mes))
                return (
                  <div key={mes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '2px solid #f3f4f6', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: dono ? '#eff6ff' : '#f9fafb', color: dono ? '#1d4ed8' : '#d1d5db', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mes}</div>
                      <div>
                        <p style={{ fontSize: 17, fontWeight: 700, color: dono ? '#111827' : '#9ca3af', margin: 0 }}>{dono ? dono.perfil?.nome : 'Disponível'}</p>
                        {dono && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{dono.perfil?.email}</p>}
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: dono ? '#16a34a' : '#d1d5db' }}>{fmt(potMensal)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Participantes */}
        {aba === 'membros' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Participantes</h2>
            {membros.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 16 }}>Nenhum participante ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {membros.map((m, idx) => (
                  <div key={m.id} style={{ border: '2px solid #f3f4f6', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>{idx + 1}º — {m.perfil?.nome}</p>
                        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{m.perfil?.email}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: 0 }}>{m.cotas || 0} cota{m.cotas !== 1 ? 's' : ''}</p>
                        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{fmt((m.cotas || 0) * valorCota)}/mês</p>
                      </div>
                    </div>
                    {m.cotas > 0 ? (
                      <div>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>Marcar recebimento do consórcio:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {m.mesesEscolhidos?.sort((a, b) => a - b).map(mes => {
                            const pago = m.pagamentos?.includes(mes)
                            return (
                              <button key={mes} onClick={() => marcarPagamento(m.id, mes)} style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
                                fontSize: 14, fontWeight: 700, cursor: 'pointer',
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

        {/* Novo participante */}
        {aba === 'novo' && (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', maxWidth: 480 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={22} /> Novo participante
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Será adicionado ao {consorcio.nome}.</p>
            <form onSubmit={criarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Nome completo', value: nome, set: setNome, type: 'text', ph: 'João Silva' },
                { label: 'E-mail', value: email, set: setEmail, type: 'email', ph: 'joao@email.com' },
                { label: 'Senha', value: senha, set: setSenha, type: 'password', ph: 'Mínimo 6 caracteres' },
              ].map(({ label, value, set, type, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{label}</label>
                  <input type={type} value={value} onChange={e => set(e.target.value)} required placeholder={ph} minLength={type === 'password' ? 6 : undefined}
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              ))}
              {msg && <p style={{ fontSize: 15, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</p>}
              <button type="submit" disabled={criando} style={{
                background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: criando ? 0.6 : 1,
              }}>
                {criando ? 'Criando...' : '+ Adicionar participante'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
