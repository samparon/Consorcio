import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { LogOut, CheckCircle, Clock, BadgeCheck, ArrowLeft } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ParticipanteConsorcio({ consorcioId, onVoltar }) {
  const { user, perfil } = useAuth()
  const [consorcio, setConsorcio] = useState(null)
  const [membro, setMembro] = useState(null)
  const [mesesOcupados, setMesesOcupados] = useState([])
  const [cotas, setCotas] = useState('')
  const [mesesSelecionados, setMesesSelecionados] = useState([])
  const [fase, setFase] = useState('ver')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [aba, setAba] = useState('cotas')

  useEffect(() => { carregar() }, [user, consorcioId])

  async function carregar() {
    if (!user) return
    const cSnap = await getDoc(doc(db, 'consorcios', consorcioId))
    if (!cSnap.exists()) return
    setConsorcio({ id: cSnap.id, ...cSnap.data() })

    const mSnap = await getDoc(doc(db, 'consorcios', consorcioId, 'membros', user.uid))
    const dados = mSnap.exists() ? mSnap.data() : {}
    setMembro(dados)
    if (dados.cotas) setCotas(String(dados.cotas))
    if (dados.mesesEscolhidos) setMesesSelecionados(dados.mesesEscolhidos)

    const todosSnap = await getDocs(collection(db, 'consorcios', consorcioId, 'membros'))
    let ocupados = []
    todosSnap.forEach(d => { if (d.id !== user.uid && d.data().mesesEscolhidos) ocupados.push(...d.data().mesesEscolhidos) })
    setMesesOcupados(ocupados)
  }

  function toggleMes(mes) {
    const qtd = Number(cotas) || 0
    setMesesSelecionados(prev => {
      if (prev.includes(mes)) return prev.filter(m => m !== mes)
      if (prev.length >= qtd) return prev
      return [...prev, mes]
    })
  }

  async function salvar() {
    if (!cotas || Number(cotas) < 1) { setMsg('Informe a quantidade de cotas.'); return }
    if (mesesSelecionados.length !== Number(cotas)) { setMsg(`Escolha exatamente ${cotas} mês${Number(cotas) > 1 ? 'es' : ''}.`); return }
    setSalvando(true)
    try {
      await updateDoc(doc(db, 'consorcios', consorcioId, 'membros', user.uid), {
        cotas: Number(cotas), mesesEscolhidos: mesesSelecionados,
      })
      setMsg('Salvo!')
      setFase('ver')
      await carregar()
    } catch { setMsg('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  async function marcarPagamentoMensal(mes) {
    const pagamentosMensais = membro?.pagamentosMensais || []
    const novos = pagamentosMensais.includes(mes) ? pagamentosMensais.filter(m => m !== mes) : [...pagamentosMensais, mes]
    await updateDoc(doc(db, 'consorcios', consorcioId, 'membros', user.uid), { pagamentosMensais: novos })
    await carregar()
  }

  if (!consorcio) return <div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>

  const totalMeses = consorcio.totalCotasPlano || 12
  const valorCota = consorcio.valorCota || 100
  const potMensal = totalMeses * valorCota
  const jaConfigurou = !!membro?.cotas && membro?.mesesEscolhidos?.length > 0
  const pagamentosMensais = membro?.pagamentosMensais || []
  const totalPago = pagamentosMensais.length * ((membro?.cotas || 0) * valorCota)
  const totalDevido = totalMeses * ((membro?.cotas || 0) * valorCota)

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onVoltar} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>|</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>💰 {consorcio.nome}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>Olá, <strong>{perfil?.nome}</strong></span>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.75)', fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Pot */}
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', borderRadius: 24, padding: '36px 40px', boxShadow: '0 8px 30px rgba(29,78,216,0.3)' }}>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Pot mensal — {consorcio.nome}</p>
          <p style={{ fontSize: 52, fontWeight: 900, color: 'white', margin: 0 }}>{fmt(potMensal)}</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{totalMeses} cotas · {fmt(valorCota)}/cota/mês</p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[['cotas', 'Minhas cotas'], ['pagamentos', 'Pagamentos']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} style={{
              padding: '12px 28px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: aba === id ? '#1d4ed8' : 'white', color: aba === id ? 'white' : '#374151',
              boxShadow: aba === id ? '0 4px 12px rgba(29,78,216,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
            }}>{label}</button>
          ))}
        </div>

        {/* ABA: Cotas */}
        {aba === 'cotas' && (
          <>
            <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 28 }}>Minhas cotas</h2>
              {jaConfigurou && fase === 'ver' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    { label: 'Cotas compradas', value: membro.cotas },
                    { label: 'Pagamento mensal', value: fmt(membro.cotas * valorCota), color: '#1d4ed8' },
                    { label: 'Meses para receber', value: membro.mesesEscolhidos?.sort((a,b)=>a-b).join(', '), color: '#16a34a' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 18 }}>
                      <span style={{ fontSize: 17, color: '#6b7280' }}>{label}</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: color || '#111827' }}>{value}</span>
                    </div>
                  ))}
                  <button onClick={() => { setFase('escolher'); setMesesSelecionados([]); setMsg('') }}
                    style={{ alignSelf: 'flex-start', fontSize: 16, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>
                    ✏️ Alterar escolha
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Quantas cotas você quer comprar?</label>
                    <input type="number" min="1" value={cotas} onChange={e => { setCotas(e.target.value); setMesesSelecionados([]) }} placeholder="Ex: 1"
                      style={{ border: '2px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', fontSize: 18, width: 140, outline: 'none', color: '#111827' }} />
                    {cotas && <p style={{ fontSize: 15, color: '#6b7280', marginTop: 8 }}>Você pagará {fmt(Number(cotas) * valorCota)}/mês</p>}
                  </div>
                  {cotas && Number(cotas) > 0 && (
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                        Escolha {cotas} mês{Number(cotas) > 1 ? 'es' : ''} para receber
                        <span style={{ fontSize: 15, fontWeight: 500, color: '#9ca3af', marginLeft: 8 }}>({mesesSelecionados.length}/{cotas})</span>
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                        {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                          const ocupado = mesesOcupados.includes(mes)
                          const selecionado = mesesSelecionados.includes(mes)
                          return (
                            <button key={mes} disabled={ocupado} onClick={() => toggleMes(mes)} style={{
                              padding: '16px 8px', borderRadius: 12, fontSize: 17, fontWeight: 800, cursor: ocupado ? 'not-allowed' : 'pointer',
                              border: `2px solid ${ocupado ? '#f3f4f6' : selecionado ? '#1d4ed8' : '#e5e7eb'}`,
                              background: ocupado ? '#f9fafb' : selecionado ? '#1d4ed8' : 'white',
                              color: ocupado ? '#d1d5db' : selecionado ? 'white' : '#374151',
                            }}>{mes}</button>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>Meses em cinza já foram escolhidos.</p>
                    </div>
                  )}
                  {msg && <p style={{ fontSize: 16, color: msg.includes('Salvo') ? '#16a34a' : '#dc2626' }}>{msg}</p>}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button onClick={salvar} disabled={salvando} style={{
                      background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                      border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 800, cursor: 'pointer', opacity: salvando ? 0.6 : 1,
                    }}>{salvando ? 'Salvando...' : 'Confirmar'}</button>
                    {jaConfigurou && (
                      <button onClick={() => setFase('ver')} style={{ fontSize: 16, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {jaConfigurou && (
              <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Seus meses de recebimento</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {membro.mesesEscolhidos?.sort((a, b) => a - b).map(mes => (
                    <div key={mes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14, padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CheckCircle size={22} color="#16a34a" />
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>Mês {mes}</span>
                      </div>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{fmt(potMensal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ABA: Pagamentos */}
        {aba === 'pagamentos' && (
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Meus pagamentos</h2>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Total pago</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', margin: 0 }}>{fmt(totalPago)}</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>de {fmt(totalDevido)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                const pago = pagamentosMensais.includes(mes)
                const valorMensal = (membro?.cotas || 0) * valorCota
                return (
                  <div key={mes} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `2px solid ${pago ? '#bbf7d0' : '#e5e7eb'}`,
                    background: pago ? '#f0fdf4' : 'white', borderRadius: 16, padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: pago ? '#dcfce7' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pago ? <CheckCircle size={24} color="#16a34a" /> : <Clock size={24} color="#1d4ed8" />}
                      </div>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 800, color: pago ? '#15803d' : '#111827', margin: 0 }}>Mês {mes}</p>
                        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Vencimento: dia 10 · {fmt(valorMensal)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: pago ? '#16a34a' : '#374151' }}>
                        {pago ? '✅ Pago' : fmt(valorMensal)}
                      </span>
                      {!pago ? (
                        <button onClick={() => marcarPagamentoMensal(mes)} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white',
                          border: 'none', borderRadius: 12, padding: '12px 22px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                        }}><BadgeCheck size={18} /> Marcar pago</button>
                      ) : (
                        <button onClick={() => marcarPagamentoMensal(mes)} style={{ fontSize: 13, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>desfazer</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
