import { useEffect, useState } from 'react'
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { LogOut, CheckCircle, Clock, BadgeCheck, ArrowLeft, Copy, Check, User, Key } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ParticipanteConsorcio({ consorcioId, onVoltar }) {
  const { user, perfil } = useAuth()
  const [consorcio, setConsorcio] = useState(null)
  const [membro, setMembro] = useState(null)
  const [aba, setAba] = useState('cotas')
  const [copiado, setCopiado] = useState(false)
  const [chavePix, setChavePix] = useState('')
  const [salvandoPix, setSalvandoPix] = useState(false)
  const [msgPix, setMsgPix] = useState('')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgSenha, setMsgSenha] = useState('')

  useEffect(() => { carregar() }, [user, consorcioId])

  async function carregar() {
    if (!user) return
    const cSnap = await getDoc(doc(db, 'consorcios', consorcioId))
    if (!cSnap.exists()) return
    setConsorcio({ id: cSnap.id, ...cSnap.data() })

    const mSnap = await getDoc(doc(db, 'consorcios', consorcioId, 'membros', user.uid))
    setMembro(mSnap.exists() ? mSnap.data() : {})

    const uSnap = await getDoc(doc(db, 'usuarios', user.uid))
    if (uSnap.exists()) setChavePix(uSnap.data()?.chavePix || '')
  }

  async function salvarPix(e) {
    e.preventDefault()
    setSalvandoPix(true)
    setMsgPix('')
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { chavePix: chavePix.trim() })
      setMsgPix('✅ Chave PIX salva!')
    } catch {
      setMsgPix('❌ Erro ao salvar.')
    } finally {
      setSalvandoPix(false)
    }
  }

  async function alterarSenha(e) {
    e.preventDefault()
    setMsgSenha('')
    if (senhaNova !== senhaConfirm) { setMsgSenha('❌ As senhas novas não coincidem.'); return }
    if (senhaNova.length < 6) { setMsgSenha('❌ A nova senha precisa ter pelo menos 6 caracteres.'); return }
    setSalvandoSenha(true)
    try {
      const credencial = EmailAuthProvider.credential(user.email, senhaAtual)
      await reauthenticateWithCredential(auth.currentUser, credencial)
      await updatePassword(auth.currentUser, senhaNova)
      setMsgSenha('✅ Senha alterada com sucesso!')
      setSenhaAtual(''); setSenhaNova(''); setSenhaConfirm('')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMsgSenha('❌ Senha atual incorreta.')
      } else {
        setMsgSenha('❌ Erro: ' + err.message)
      }
    } finally {
      setSalvandoSenha(false)
    }
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
  const temCotas = !!membro?.cotas && membro?.mesesEscolhidos?.length > 0
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['cotas', 'Minhas cotas'], ['pagamentos', 'Pagamentos'], ['perfil', 'Meu Perfil'], ['regras', 'Regras']].map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} style={{
              padding: '12px 28px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: aba === id ? '#1d4ed8' : 'white', color: aba === id ? 'white' : '#374151',
              boxShadow: aba === id ? '0 4px 12px rgba(29,78,216,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
            }}>{label}</button>
          ))}
        </div>

        {/* ABA: Cotas */}
        {aba === 'cotas' && (
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 28 }}>Minhas cotas</h2>
            {temCotas ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { label: 'Cotas', value: membro.cotas },
                  { label: 'Pagamento mensal', value: fmt(membro.cotas * valorCota), color: '#1d4ed8' },
                  { label: 'Meses sorteados para receber', value: membro.mesesEscolhidos?.sort((a,b)=>a-b).join(', '), color: '#16a34a' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 18 }}>
                    <span style={{ fontSize: 17, color: '#6b7280' }}>{label}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: color || '#111827' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {membro.mesesEscolhidos?.sort((a, b) => a - b).map(mes => (
                    <div key={mes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14, padding: '18px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CheckCircle size={22} color="#16a34a" />
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>Mês {mes} — sorteado</span>
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>{fmt(potMensal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
                <p style={{ fontSize: 18, color: '#6b7280', fontWeight: 600 }}>Aguardando sorteio</p>
                <p style={{ fontSize: 15, color: '#9ca3af', marginTop: 6 }}>O admin irá definir suas cotas e os meses sorteados em breve.</p>
              </div>
            )}
          </div>
        )}

        {/* ABA: Pagamentos */}
        {aba === 'pagamentos' && (
          <>
          {/* Card PIX */}
          <div style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)', borderRadius: 24, padding: '28px 36px', boxShadow: '0 8px 24px rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 600, letterSpacing: 1 }}>PAGUE VIA PIX</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 12px', }}>Chave celular — vencimento todo dia 10</p>
              <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, letterSpacing: 1 }}>61996166127</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText('61996166127'); setCopiado(true); setTimeout(() => setCopiado(false), 2500) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: copiado ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.4)', borderRadius: 16,
                padding: '16px 24px', cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: 14,
                transition: 'all 0.2s', minWidth: 100,
              }}>
              {copiado ? <Check size={24} /> : <Copy size={24} />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

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
          </>
        )}

        {/* ABA: Perfil */}
        {aba === 'perfil' && (
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={26} color="#1d4ed8" />
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>{perfil?.nome}</p>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{perfil?.email}</p>
              </div>
            </div>

            <form onSubmit={salvarPix} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  <Key size={18} color="#16a34a" /> Minha chave PIX
                </label>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                  O admin usa essa chave para te pagar até o dia 15 quando você for contemplado.
                </p>
                <input
                  type="text"
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  placeholder="CPF, celular, e-mail ou chave aleatória"
                  required
                  style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '14px 18px', fontSize: 16, outline: 'none', color: '#111827', boxSizing: 'border-box' }}
                />
              </div>
              {msgPix && <p style={{ fontSize: 15, color: msgPix.includes('✅') ? '#16a34a' : '#dc2626', margin: 0 }}>{msgPix}</p>}
              <button type="submit" disabled={salvandoPix} style={{
                background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white',
                border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: salvandoPix ? 0.6 : 1,
              }}>
                {salvandoPix ? 'Salvando...' : 'Salvar chave PIX'}
              </button>
            </form>

            <div style={{ borderTop: '2px solid #f3f4f6', marginTop: 32, paddingTop: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                🔒 Alterar senha
              </h3>
              <form onSubmit={alterarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Senha atual', value: senhaAtual, set: setSenhaAtual },
                  { label: 'Nova senha', value: senhaNova, set: setSenhaNova },
                  { label: 'Confirmar nova senha', value: senhaConfirm, set: setSenhaConfirm },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{label}</label>
                    <input
                      type="password"
                      value={value}
                      onChange={e => set(e.target.value)}
                      required
                      minLength={label === 'Senha atual' ? 1 : 6}
                      style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '13px 16px', fontSize: 15, outline: 'none', color: '#111827', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                {msgSenha && <p style={{ fontSize: 15, color: msgSenha.includes('✅') ? '#16a34a' : '#dc2626', margin: 0 }}>{msgSenha}</p>}
                <button type="submit" disabled={salvandoSenha} style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white',
                  border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: salvandoSenha ? 0.6 : 1,
                }}>
                  {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ABA: Regras */}
        {aba === 'regras' && (
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 28 }}>Regras do Consórcio</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { n: 1, texto: 'O vencimento da cota mensal ocorrerá todo dia 10 de cada mês.' },
                { n: 2, texto: 'O pagamento do prêmio ao participante contemplado será realizado até o dia 15 de cada mês.' },
                { n: 3, texto: 'O participante contemplado deverá estar em dia com o pagamento de sua cota.' },
                { n: 4, texto: 'Caso o participante esteja com a cota vencida, terá até a data da contemplação para regularizar o débito.' },
                { n: 5, texto: 'Se o participante for contemplado e permanecer inadimplente na data da contemplação, não poderá receber o prêmio naquele mês, sendo o pagamento condicionado à quitação integral das parcelas em atraso.' },
                { n: 6, texto: 'Os pagamentos das cotas deverão ser realizados via PIX, para a chave que será oportunamente informada pela responsável pelo consórcio.' },
                { n: 7, texto: 'Recomenda-se que todos os participantes enviem o comprovante de pagamento após a realização do PIX, a fim de facilitar o controle e a organização do grupo.' },
              ].map(({ n, texto }) => (
                <div key={n} style={{ display: 'flex', gap: 16, padding: '18px 20px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                  <div style={{ minWidth: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: 'white', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                  <p style={{ fontSize: 16, color: '#374151', margin: 0, lineHeight: 1.6 }}>{texto}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, padding: '18px 20px', background: '#fefce8', border: '2px solid #fde047', borderRadius: 14 }}>
              <p style={{ fontSize: 15, color: '#854d0e', margin: 0, fontWeight: 600, lineHeight: 1.6 }}>
                Declaram os participantes estar cientes e de acordo com as regras acima estabelecidas para o bom funcionamento do consórcio.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
