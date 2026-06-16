import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, deleteDoc, collection, getDocs, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { auth, db } from '../../firebase'
import { LogOut, UserPlus, CheckCircle, Circle, ArrowLeft, Users, DollarSign, Calendar, Trash2 } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DOMAIN = '@consorcio.app'
const toEmail = login => login.trim().toLowerCase() + DOMAIN

export default function AdminConsorcio({ consorcioId, onVoltar }) {
  const [consorcio, setConsorcio] = useState(null)
  const [membros, setMembros] = useState([])
  const [aba, setAba] = useState('visao')
  const [nome, setNome] = useState('')
  const [loginNovo, setLoginNovo] = useState('')
  const [senha, setSenha] = useState('')
  const [criando, setCriando] = useState(false)
  const [msg, setMsg] = useState('')
  const [loginExistente, setLoginExistente] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [msgExistente, setMsgExistente] = useState('')
  const [removendo, setRemovendo] = useState(null)
  const [cotasNovo, setCotasNovo] = useState('1')
  const [cotasExistente, setCotasExistente] = useState('1')
  const [sorteando, setSorteando] = useState(false)
  const [resultadoSorteio, setResultadoSorteio] = useState(null)

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

    // Atualiza totalCotasPlano automaticamente
    const totalCalculado = lista.reduce((acc, m) => acc + (Number(m.cotas) || 0), 0)
    if (totalCalculado !== cSnap.data().totalCotasPlano) {
      await updateDoc(doc(db, 'consorcios', consorcioId), { totalCotasPlano: totalCalculado })
      setConsorcio(prev => ({ ...prev, totalCotasPlano: totalCalculado }))
    }
  }

  function toggleMes(mes, lista, setLista, maxCotas) {
    setLista(prev => prev.includes(mes) ? prev.filter(m => m !== mes) : prev.length < Number(maxCotas) ? [...prev, mes] : prev)
  }

  async function criarUsuario(e) {
    e.preventDefault()
    setMsg('')
    setCriando(true)
    try {
      const fakeEmail = toEmail(loginNovo)
      const app2 = initializeApp(auth.app.options, 'sec-' + Date.now())
      const auth2 = getAuth(app2)
      const cred = await createUserWithEmailAndPassword(auth2, fakeEmail, senha)
      const uid = cred.user.uid

      const uSnap = await getDoc(doc(db, 'usuarios', uid))
      if (!uSnap.exists()) {
        await setDoc(doc(db, 'usuarios', uid), {
          nome, login: loginNovo.trim().toLowerCase(), role: 'participante', criadoEm: Date.now(), consorcios: [consorcioId],
        })
      } else {
        await updateDoc(doc(db, 'usuarios', uid), { consorcios: arrayUnion(consorcioId) })
      }

      await setDoc(doc(db, 'consorcios', consorcioId, 'membros', uid), {
        cotas: Number(cotasNovo), mesesEscolhidos: [], pagamentos: [], pagamentosMensais: [], entradaEm: Date.now(),
      })

      await auth2.signOut()
      setMsg('✅ Participante adicionado!')
      setNome(''); setLoginNovo(''); setSenha(''); setCotasNovo('1')
      await carregar()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setMsg('❌ Login já existe. Use "Adicionar existente" para adicioná-lo a este consórcio.')
      } else {
        setMsg('❌ ' + err.message)
      }
    } finally {
      setCriando(false)
    }
  }

  async function adicionarExistente(e) {
    e.preventDefault()
    setMsgExistente('')
    setAdicionando(true)
    try {
      const loginBusca = loginExistente.trim().toLowerCase()
      const snap = await getDocs(collection(db, 'usuarios'))
      let encontrado = null
      snap.forEach(d => { if (d.data().login === loginBusca) encontrado = { id: d.id, ...d.data() } })

      if (!encontrado) { setMsgExistente('❌ Nenhum usuário encontrado com esse login.'); return }

      const jaEMembro = membros.find(m => m.id === encontrado.id)
      if (jaEMembro) { setMsgExistente('❌ Esse usuário já está neste consórcio.'); return }

      await updateDoc(doc(db, 'usuarios', encontrado.id), { consorcios: arrayUnion(consorcioId) })
      await setDoc(doc(db, 'consorcios', consorcioId, 'membros', encontrado.id), {
        cotas: Number(cotasExistente), mesesEscolhidos: [], pagamentos: [], pagamentosMensais: [], entradaEm: Date.now(),
      })
      setMsgExistente(`✅ ${encontrado.nome} adicionado com sucesso!`)
      setLoginExistente(''); setCotasExistente('1')
      await carregar()
    } catch (err) {
      setMsgExistente('❌ Erro: ' + err.message)
    } finally {
      setAdicionando(false)
    }
  }

  async function realizarSorteio() {
    const participantes = membros.filter(m => m.cotas > 0)
    if (participantes.length === 0) { alert('Nenhum participante com cotas cadastradas.'); return }

    const totalCotas = participantes.reduce((acc, m) => acc + m.cotas, 0)
    if (totalCotas > totalCotasPlano) { alert(`Total de cotas (${totalCotas}) ultrapassa o plano (${totalCotasPlano}).`); return }

    if (!window.confirm(`Sortear meses para ${participantes.length} participante(s)? Isso vai substituir os meses atuais.`)) return

    setSorteando(true)
    try {
      // Embaralha os meses disponíveis (Fisher-Yates)
      const meses = Array.from({ length: totalCotasPlano }, (_, i) => i + 1)
      for (let i = meses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [meses[i], meses[j]] = [meses[j], meses[i]]
      }

      // Distribui os meses na ordem dos participantes
      const resultado = []
      let idx = 0
      for (const m of participantes) {
        const mesesDoMembro = meses.slice(idx, idx + m.cotas).sort((a, b) => a - b)
        idx += m.cotas
        await updateDoc(doc(db, 'consorcios', consorcioId, 'membros', m.id), { mesesEscolhidos: mesesDoMembro })
        resultado.push({ nome: m.perfil?.nome, cotas: m.cotas, meses: mesesDoMembro })
      }
      setResultadoSorteio(resultado)
      await carregar()
    } catch (err) {
      alert('Erro no sorteio: ' + err.message)
    } finally {
      setSorteando(false)
    }
  }

  async function removerParticipante(uid) {
    if (!window.confirm('Remover este participante do consórcio?')) return
    setRemovendo(uid)
    try {
      await deleteDoc(doc(db, 'consorcios', consorcioId, 'membros', uid))
      await updateDoc(doc(db, 'usuarios', uid), { consorcios: arrayRemove(consorcioId) })
      await carregar()
    } catch (err) {
      alert('Erro ao remover: ' + err.message)
    } finally {
      setRemovendo(null)
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
          {[['visao', 'Calendário'], ['membros', 'Participantes'], ['sorteio', '🎲 Sorteio'], ['novo', 'Novo participante']].map(([id, label]) => (
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
                        {dono && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>@{dono.perfil?.login}</p>}
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
                        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>@{m.perfil?.login}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: 0 }}>{m.cotas || 0} cota{m.cotas !== 1 ? 's' : ''}</p>
                          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{fmt((m.cotas || 0) * valorCota)}/mês</p>
                        </div>
                        <button
                          onClick={() => removerParticipante(m.id)}
                          disabled={removendo === m.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#fef2f2', color: '#dc2626', border: '2px solid #fecaca',
                            borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            opacity: removendo === m.id ? 0.5 : 1,
                          }}>
                          <Trash2 size={15} /> {removendo === m.id ? 'Removendo...' : 'Remover'}
                        </button>
                      </div>
                    </div>
                    {m.perfil?.chavePix && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 14 }}>
                        <span style={{ fontSize: 18 }}>💸</span>
                        <div>
                          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Chave PIX para pagar (até dia 15): </span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>{m.perfil.chavePix}</span>
                        </div>
                      </div>
                    )}
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
                                {pago ? <CheckCircle size={15} /> : <Circle size={15} />} {mes}/{totalCotasPlano}
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

        {/* Sorteio */}
        {aba === 'sorteio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Card de info */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 24, padding: '32px 36px', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 8px', fontWeight: 600, letterSpacing: 1 }}>SORTEIO AUTOMÁTICO</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>🎲 Distribuir meses aleatoriamente</p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                Os {totalCotasPlano} meses são embaralhados e distribuídos conforme o número de cotas de cada participante.
              </p>
            </div>

            {/* Resumo dos participantes */}
            <div style={{ background: 'white', borderRadius: 24, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Participantes no sorteio</h2>
              {membros.filter(m => m.cotas > 0).length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 16 }}>Nenhum participante com cotas cadastradas ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {membros.filter(m => m.cotas > 0).map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                        <div>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{m.perfil?.nome}</p>
                          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{m.cotas} cota{m.cotas !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {m.mesesEscolhidos?.length > 0 ? (
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 12px', borderRadius: 8 }}>
                            Meses: {m.mesesEscolhidos.sort((a,b)=>a-b).join(', ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#f59e0b', background: '#fffbeb', padding: '4px 12px', borderRadius: 8 }}>Aguardando sorteio</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: '#eff6ff', borderRadius: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>Total de cotas distribuídas</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>
                      {membros.filter(m => m.cotas > 0).reduce((acc, m) => acc + m.cotas, 0)} / {totalCotasPlano}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={realizarSorteio}
                disabled={sorteando || membros.filter(m => m.cotas > 0).length === 0}
                style={{
                  width: '100%', padding: '18px', fontSize: 18, fontWeight: 900, border: 'none', borderRadius: 16, cursor: 'pointer',
                  background: sorteando ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: sorteando ? '#9ca3af' : 'white',
                  boxShadow: sorteando ? 'none' : '0 6px 20px rgba(124,58,237,0.4)',
                }}>
                {sorteando ? '🎲 Sorteando...' : '🎲 Realizar Sorteio'}
              </button>
            </div>

            {/* Resultado do sorteio */}
            {resultadoSorteio && (
              <div style={{ background: 'white', borderRadius: 24, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>🎉 Resultado do Sorteio</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {resultadoSorteio.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14 }}>
                      <div>
                        <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0 }}>{r.nome}</p>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{r.cotas} cota{r.cotas !== 1 ? 's' : ''}</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>Mês{r.meses.length > 1 ? 'es' : ''}: {r.meses.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Novo participante */}
        {aba === 'novo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>

            {/* Adicionar existente */}
            <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 20, padding: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', marginBottom: 6 }}>Adicionar usuário existente</h3>
              <p style={{ fontSize: 14, color: '#3b82f6', marginBottom: 20 }}>Usuário que já tem conta no sistema — informe o e-mail dele.</p>
              <form onSubmit={adicionarExistente} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="text" value={loginExistente} onChange={e => setLoginExistente(e.target.value)} required placeholder="login do participante"
                  autoCapitalize="none"
                  style={{ width: '100%', border: '2px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                <div>
                  <label style={{ fontSize: 14, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nº de cotas</label>
                  <input type="number" min="1" value={cotasExistente} onChange={e => setCotasExistente(e.target.value)}
                    style={{ width: 100, border: '2px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 15, outline: 'none', color: '#111827' }} />
                </div>
                {msgExistente && <p style={{ fontSize: 14, color: msgExistente.includes('✅') ? '#16a34a' : '#dc2626' }}>{msgExistente}</p>}
                <button type="submit" disabled={adicionando} style={{
                  background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 12,
                  padding: '12px', fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: adicionando ? 0.6 : 1,
                }}>{adicionando ? 'Buscando...' : 'Adicionar ao consórcio'}</button>
              </form>
            </div>

            {/* Criar novo */}
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={22} /> Criar novo participante
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Cria uma nova conta e adiciona ao {consorcio.nome}.</p>
            <form onSubmit={criarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Nome completo', value: nome, set: setNome, type: 'text', ph: 'João Silva' },
                { label: 'Login', value: loginNovo, set: setLoginNovo, type: 'text', ph: 'Ex: mario (sem espaço)', cap: 'none' },
                { label: 'Senha', value: senha, set: setSenha, type: 'password', ph: 'Mínimo 6 caracteres' },
              ].map(({ label, value, set, type, ph, cap }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{label}</label>
                  <input type={type} value={value} onChange={e => set(e.target.value)} required placeholder={ph} minLength={type === 'password' ? 6 : undefined} autoCapitalize={cap}
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Nº de cotas</label>
                <input type="number" min="1" value={cotasNovo} onChange={e => setCotasNovo(e.target.value)}
                  style={{ width: 100, border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', fontSize: 15, outline: 'none', color: '#111827' }} />
              </div>
              {msg && <p style={{ fontSize: 15, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</p>}
              <button type="submit" disabled={criando} style={{
                background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: criando ? 0.6 : 1,
              }}>
                {criando ? 'Criando...' : '+ Criar participante'}
              </button>
            </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
