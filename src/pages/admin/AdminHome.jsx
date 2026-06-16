import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { LogOut, PlusCircle, ChevronRight, Download } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AdminHome({ onEntrar }) {
  const [consorcios, setConsorcios] = useState([])
  const [criando, setCriando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [nome, setNome] = useState('')
  const [totalCotas, setTotalCotas] = useState('12')
  const [valorCota, setValorCota] = useState('100')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const snap = await getDocs(collection(db, 'consorcios'))
    const lista = []
    for (const d of snap.docs) {
      const membrosSnap = await getDocs(collection(db, 'consorcios', d.id, 'membros'))
      lista.push({ id: d.id, ...d.data(), totalMembros: membrosSnap.size })
    }
    lista.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))
    setConsorcios(lista)
  }

  async function exportarBackup() {
    setExportando(true)
    try {
      const backup = { exportadoEm: new Date().toISOString(), consorcios: [], usuarios: [] }

      // Exporta consórcios e membros
      const cSnap = await getDocs(collection(db, 'consorcios'))
      for (const c of cSnap.docs) {
        const membrosSnap = await getDocs(collection(db, 'consorcios', c.id, 'membros'))
        const membros = membrosSnap.docs.map(m => ({ id: m.id, ...m.data() }))
        backup.consorcios.push({ id: c.id, ...c.data(), membros })
      }

      // Exporta usuários
      const uSnap = await getDocs(collection(db, 'usuarios'))
      uSnap.forEach(u => backup.usuarios.push({ id: u.id, ...u.data() }))

      // Faz download do JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-consorcio-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao exportar: ' + err.message)
    } finally {
      setExportando(false)
    }
  }

  async function criarConsorcio(e) {
    e.preventDefault()
    setMsg('')
    setSalvando(true)
    try {
      await addDoc(collection(db, 'consorcios'), {
        nome,
        totalCotasPlano: Number(totalCotas),
        valorCota: Number(valorCota),
        criadoEm: Date.now(),
      })
      setMsg('✅ Consórcio criado!')
      setNome(''); setTotalCotas('12'); setValorCota('100')
      setCriando(false)
      await carregar()
    } catch {
      setMsg('❌ Erro ao criar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>💰</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Consórcio</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 13, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={exportarBackup} disabled={exportando} title="Exportar backup" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            <Download size={16} /> {exportando ? 'Exportando...' : 'Backup'}
          </button>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#111827', margin: 0 }}>Meus Consórcios</h1>
            <p style={{ color: '#6b7280', fontSize: 16, marginTop: 4 }}>{consorcios.length} consórcio{consorcios.length !== 1 ? 's' : ''} criado{consorcios.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setCriando(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
            border: 'none', borderRadius: 14, padding: '14px 24px', fontSize: 16, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(29,78,216,0.3)',
          }}>
            <PlusCircle size={20} /> Novo Consórcio
          </button>
        </div>

        {/* Lista de consórcios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {consorcios.length === 0 && !criando && (
            <div style={{ background: 'white', borderRadius: 20, padding: '48px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
              <p style={{ fontSize: 18, color: '#6b7280' }}>Nenhum consórcio criado ainda.</p>
              <p style={{ fontSize: 15, color: '#9ca3af', marginTop: 4 }}>Clique em "Novo Consórcio" para começar.</p>
            </div>
          )}
          {consorcios.map(c => (
            <div key={c.id} onClick={() => onEntrar(c.id)} style={{
              background: 'white', borderRadius: 20, padding: '24px 28px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '2px solid transparent', transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#1d4ed8'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💰</div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{c.nome}</p>
                  <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                    {c.totalCotasPlano} cotas · {fmt(c.valorCota)}/cota · Pot: {fmt(c.totalCotasPlano * c.valorCota)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', margin: 0 }}>{c.totalMembros}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>participantes</p>
                </div>
                <ChevronRight size={24} color="#9ca3af" />
              </div>
            </div>
          ))}
        </div>

        {/* Formulário novo consórcio */}
        {criando && (
          <div style={{ background: 'white', borderRadius: 20, padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 520 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Novo Consórcio</h2>
            <form onSubmit={criarConsorcio} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Nome do consórcio</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Consórcio 1"
                  style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '13px 16px', fontSize: 16, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Total de cotas</label>
                  <input type="number" min="1" value={totalCotas} onChange={e => setTotalCotas(e.target.value)} required
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '13px 16px', fontSize: 16, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Valor por cota (R$)</label>
                  <input type="number" min="1" value={valorCota} onChange={e => setValorCota(e.target.value)} required
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '13px 16px', fontSize: 16, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
                </div>
              </div>
              {totalCotas && valorCota && (
                <div style={{ background: '#eff6ff', borderRadius: 12, padding: '14px 18px' }}>
                  <p style={{ fontSize: 15, color: '#1d4ed8', fontWeight: 700, margin: 0 }}>
                    Pot mensal: {fmt(Number(totalCotas) * Number(valorCota))} · {totalCotas} meses de duração
                  </p>
                </div>
              )}
              {msg && <p style={{ fontSize: 15, color: msg.includes('✅') ? '#16a34a' : '#dc2626' }}>{msg}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={salvando} style={{
                  flex: 1, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                  border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                }}>
                  {salvando ? 'Criando...' : 'Criar Consórcio'}
                </button>
                <button type="button" onClick={() => setCriando(false)} style={{
                  padding: '14px 20px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  background: '#f3f4f6', color: '#374151', border: 'none',
                }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
