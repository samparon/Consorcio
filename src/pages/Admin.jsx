import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { LogOut, UserPlus, Users, CheckCircle, Circle } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const VALOR_COTA = 100

export default function Admin() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState('visao') // 'visao' | 'usuarios' | 'novo'
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
      // Cria auth secundário para não deslogar o admin
      const app2 = initializeApp(auth.app.options, 'secondary-' + Date.now())
      const auth2 = getAuth(app2)
      const cred = await createUserWithEmailAndPassword(auth2, email, senha)
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nome,
        email,
        role: 'participante',
        criadoEm: Date.now(),
        cotas: 0,
        mesesEscolhidos: [],
        pagamentos: [],
      })
      await auth2.signOut()
      setMsg('Usuário criado com sucesso!')
      setNome(''); setEmail(''); setSenha('')
      await carregar()
    } catch (err) {
      setMsg('Erro: ' + (err.code === 'auth/email-already-in-use' ? 'E-mail já cadastrado.' : err.message))
    } finally {
      setCriando(false)
    }
  }

  async function marcarPagamento(userId, mes) {
    const p = participantes.find(u => u.id === userId)
    if (!p) return
    const pagamentos = p.pagamentos || []
    const jaExiste = pagamentos.includes(mes)
    const novos = jaExiste ? pagamentos.filter(m => m !== mes) : [...pagamentos, mes]
    await updateDoc(doc(db, 'usuarios', userId), { pagamentos: novos })
    await carregar()
  }

  const totalCotas = participantes.filter(p => p.role !== 'admin').reduce((acc, p) => acc + (Number(p.cotas) || 0), 0)
  const potMensal = totalCotas * VALOR_COTA
  const totalMeses = totalCotas

  const tabBtn = (id, label) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${aba === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-bold text-gray-800">Consórcio</span>
          <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
          <LogOut size={15} /> Sair
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-xs text-gray-500 mb-1">Participantes</p>
            <p className="text-2xl font-bold text-gray-800">{participantes.filter(p => p.role !== 'admin').length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-xs text-gray-500 mb-1">Total de cotas</p>
            <p className="text-2xl font-bold text-gray-800">{totalCotas}</p>
          </div>
          <div className="bg-blue-600 rounded-xl shadow p-5 text-center">
            <p className="text-xs text-white opacity-80 mb-1">Pot mensal</p>
            <p className="text-2xl font-bold text-white">{fmt(potMensal)}</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 bg-white rounded-xl shadow p-2 w-fit">
          {tabBtn('visao', 'Visão geral')}
          {tabBtn('usuarios', 'Participantes')}
          {tabBtn('novo', 'Novo usuário')}
        </div>

        {/* Visão geral — calendário de meses */}
        {aba === 'visao' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Calendário do consórcio</h2>
            {totalMeses === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum participante configurou cotas ainda.</p>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: totalMeses }, (_, i) => i + 1).map(mes => {
                  const dono = participantes.find(p => p.mesesEscolhidos?.includes(mes))
                  return (
                    <div key={mes} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">{mes}</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{dono ? dono.nome : <span className="text-gray-400">Mês livre</span>}</p>
                          {dono && <p className="text-xs text-gray-400">{dono.email}</p>}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">{fmt(potMensal)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Participantes */}
        {aba === 'usuarios' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Participantes</h2>
            <div className="space-y-4">
              {participantes.filter(p => p.role !== 'admin').map((p, idx) => (
                <div key={p.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{idx + 1}º — {p.nome}</p>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{p.cotas || 0} cota{p.cotas !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-400">{fmt((p.cotas || 0) * VALOR_COTA)}/mês</p>
                    </div>
                  </div>

                  {p.cotas > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Meses escolhidos — clique para marcar pagamento recebido:</p>
                      <div className="flex flex-wrap gap-2">
                        {p.mesesEscolhidos?.sort((a, b) => a - b).map(mes => {
                          const pago = p.pagamentos?.includes(mes)
                          return (
                            <button
                              key={mes}
                              onClick={() => marcarPagamento(p.id, mes)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                                ${pago ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400'}`}>
                              {pago ? <CheckCircle size={12} /> : <Circle size={12} />}
                              Mês {mes}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(!p.cotas || p.cotas === 0) && (
                    <p className="text-xs text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg">Ainda não configurou as cotas.</p>
                  )}
                </div>
              ))}
              {participantes.filter(p => p.role !== 'admin').length === 0 && (
                <p className="text-gray-400 text-sm">Nenhum participante cadastrado ainda.</p>
              )}
            </div>
          </div>
        )}

        {/* Novo usuário */}
        {aba === 'novo' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-md">
            <h2 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <UserPlus size={18} /> Criar novo usuário
            </h2>
            <form onSubmit={criarUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {msg && <p className={`text-sm ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
              <button
                type="submit"
                disabled={criando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {criando ? 'Criando...' : 'Criar usuário'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
