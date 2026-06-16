import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { LogOut, CheckCircle } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const VALOR_COTA = 100

export default function Participante() {
  const { user, perfil } = useAuth()
  const [meusDados, setMeusDados] = useState(null)
  const [mesesOcupados, setMesesOcupados] = useState([])
  const [totalMeses, setTotalMeses] = useState(0)
  const [cotas, setCotas] = useState('')
  const [mesesSelecionados, setMesesSelecionados] = useState([])
  const [fase, setFase] = useState('ver')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [user])

  async function carregar() {
    if (!user) return
    const snap = await getDoc(doc(db, 'usuarios', user.uid))
    const dados = snap.data()
    setMeusDados(dados)
    if (dados.cotas) setCotas(String(dados.cotas))
    if (dados.mesesEscolhidos) setMesesSelecionados(dados.mesesEscolhidos)

    const todosSnap = await getDocs(collection(db, 'usuarios'))
    let ocupados = []
    let totalCotas = 0
    todosSnap.forEach(d => {
      const u = d.data()
      if (u.mesesEscolhidos) ocupados.push(...u.mesesEscolhidos)
      if (u.cotas) totalCotas += Number(u.cotas)
    })
    if (dados.mesesEscolhidos) ocupados = ocupados.filter(m => !dados.mesesEscolhidos.includes(m))
    setMesesOcupados(ocupados)
    setTotalMeses(totalCotas)
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
    if (mesesSelecionados.length !== Number(cotas)) {
      setMsg(`Escolha exatamente ${cotas} mês${Number(cotas) > 1 ? 'es' : ''}.`)
      return
    }
    setSalvando(true)
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        cotas: Number(cotas),
        mesesEscolhidos: mesesSelecionados,
      })
      setMsg('Salvo com sucesso!')
      setFase('ver')
      await carregar()
    } catch {
      setMsg('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const mesesParaExibir = Math.max(totalMeses, Number(cotas) || 0, 12)
  const jaConfigurou = meusDados?.cotas && meusDados?.mesesEscolhidos?.length > 0
  const potMensal = totalMeses * VALOR_COTA

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30 }}>💰</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Consórcio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>Olá, <strong>{perfil?.nome || user?.email}</strong></span>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.75)', fontSize: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Card pot mensal */}
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', borderRadius: 24, padding: '36px 40px', boxShadow: '0 8px 30px rgba(29,78,216,0.35)' }}>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Pot mensal estimado</p>
          <p style={{ fontSize: 52, fontWeight: 900, color: 'white', margin: 0 }}>{fmt(potMensal)}</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{totalMeses} cotas no total · R$ {VALOR_COTA}/cota/mês</p>
        </div>

        {/* Minhas cotas */}
        <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 28 }}>Minhas cotas</h2>

          {jaConfigurou && fase === 'ver' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Cotas compradas', value: meusDados.cotas },
                { label: 'Pagamento mensal', value: fmt(meusDados.cotas * VALOR_COTA), color: '#1d4ed8' },
                { label: 'Meses para receber', value: meusDados.mesesEscolhidos?.sort((a,b)=>a-b).join(', '), color: '#16a34a' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 18 }}>
                  <span style={{ fontSize: 17, color: '#6b7280' }}>{label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: color || '#111827' }}>{value}</span>
                </div>
              ))}
              <button onClick={() => { setFase('escolher'); setMsg('') }}
                style={{ alignSelf: 'flex-start', fontSize: 16, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>
                ✏️ Alterar escolha
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Quantas cotas você quer comprar?</label>
                <input type="number" min="1" value={cotas}
                  onChange={e => { setCotas(e.target.value); setMesesSelecionados([]) }}
                  placeholder="Ex: 2"
                  style={{ border: '2px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', fontSize: 18, width: 140, outline: 'none', color: '#111827' }} />
                {cotas && <p style={{ fontSize: 15, color: '#6b7280', marginTop: 8 }}>Você pagará {fmt(Number(cotas) * VALOR_COTA)}/mês</p>}
              </div>

              {cotas && Number(cotas) > 0 && (
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                    Escolha {cotas} mês{Number(cotas) > 1 ? 'es' : ''} para receber
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#9ca3af', marginLeft: 8 }}>({mesesSelecionados.length}/{cotas} escolhidos)</span>
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                    {Array.from({ length: mesesParaExibir }, (_, i) => i + 1).map(mes => {
                      const ocupado = mesesOcupados.includes(mes)
                      const selecionado = mesesSelecionados.includes(mes)
                      return (
                        <button key={mes} disabled={ocupado} onClick={() => toggleMes(mes)} style={{
                          padding: '16px 8px', borderRadius: 12, fontSize: 17, fontWeight: 800,
                          cursor: ocupado ? 'not-allowed' : 'pointer',
                          border: `2px solid ${ocupado ? '#f3f4f6' : selecionado ? '#1d4ed8' : '#e5e7eb'}`,
                          background: ocupado ? '#f9fafb' : selecionado ? '#1d4ed8' : 'white',
                          color: ocupado ? '#d1d5db' : selecionado ? 'white' : '#374151',
                        }}>
                          {mes}
                        </button>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 12 }}>Meses em cinza já foram escolhidos por outros participantes.</p>
                </div>
              )}

              {msg && <p style={{ fontSize: 16, color: msg.includes('sucesso') ? '#16a34a' : '#dc2626' }}>{msg}</p>}

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button onClick={salvar} disabled={salvando} style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                  border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 800,
                  cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.6 : 1,
                }}>
                  {salvando ? 'Salvando...' : 'Confirmar'}
                </button>
                {jaConfigurou && (
                  <button onClick={() => setFase('ver')} style={{ fontSize: 16, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Meses de recebimento */}
        {jaConfigurou && (
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Seus meses de recebimento</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {meusDados.mesesEscolhidos?.sort((a, b) => a - b).map(mes => (
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
      </div>
    </div>
  )
}
