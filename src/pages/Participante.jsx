import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { LogOut, CheckCircle, Clock } from 'lucide-react'

const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const VALOR_COTA = 100

export default function Participante() {
  const { user, perfil } = useAuth()
  const [meusDados, setMeusDados] = useState(null)
  const [mesesOcupados, setMesesOcupados] = useState([])
  const [totalMeses, setTotalMeses] = useState(0)
  const [cotas, setCotas] = useState('')
  const [mesesSelecionados, setMesesSelecionados] = useState([])
  const [fase, setFase] = useState('ver') // 'ver' | 'escolher'
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

    // busca todos usuários para saber meses ocupados e total de meses
    const todosSnap = await getDocs(collection(db, 'usuarios'))
    let ocupados = []
    let totalCotas = 0
    todosSnap.forEach(d => {
      const u = d.data()
      if (u.mesesEscolhidos) ocupados.push(...u.mesesEscolhidos)
      if (u.cotas) totalCotas += Number(u.cotas)
    })
    // remove os meses do próprio usuário para que ele possa alterá-los
    if (dados.mesesEscolhidos) {
      ocupados = ocupados.filter(m => !dados.mesesEscolhidos.includes(m))
    }
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

  const totalMesesComNovas = totalMeses + (meusDados?.cotas ? 0 : Number(cotas) || 0)
  const mesesParaExibir = Math.max(totalMeses, Number(cotas) || 0, 12)
  const jaConfigurou = meusDados?.cotas && meusDados?.mesesEscolhidos?.length > 0
  const potMensal = totalMeses * VALOR_COTA

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-bold text-gray-800">Consórcio</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Olá, <strong>{perfil?.nome || user?.email}</strong></span>
          <button onClick={() => signOut(auth)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Resumo do consórcio */}
        <div className="bg-blue-600 text-white rounded-xl p-6">
          <p className="text-sm opacity-80 mb-1">Pot mensal estimado</p>
          <p className="text-3xl font-bold">{fmt(potMensal)}</p>
          <p className="text-sm opacity-80 mt-1">{totalMeses} cotas no total · {VALOR_COTA} reais/cota/mês</p>
        </div>

        {/* Minhas cotas */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-4">Minhas cotas</h2>

          {jaConfigurou && fase === 'ver' ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cotas compradas</span>
                <span className="font-semibold">{meusDados.cotas}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pagamento mensal</span>
                <span className="font-semibold text-blue-600">{fmt(meusDados.cotas * VALOR_COTA)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Meses para receber</span>
                <span className="font-semibold text-green-600">{meusDados.mesesEscolhidos?.sort((a,b)=>a-b).join(', ')}</span>
              </div>
              <button
                onClick={() => { setFase('escolher'); setMsg('') }}
                className="mt-2 text-sm text-blue-600 hover:underline">
                Alterar escolha
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantas cotas você quer comprar?</label>
                <input
                  type="number"
                  min="1"
                  value={cotas}
                  onChange={e => { setCotas(e.target.value); setMesesSelecionados([]) }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 2"
                />
                {cotas && <p className="text-xs text-gray-400 mt-1">Você pagará {fmt(Number(cotas) * VALOR_COTA)}/mês</p>}
              </div>

              {cotas && Number(cotas) > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Escolha {cotas} mês{Number(cotas) > 1 ? 'es' : ''} para receber
                    <span className="text-gray-400 ml-1">({mesesSelecionados.length}/{cotas} escolhidos)</span>
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: mesesParaExibir }, (_, i) => i + 1).map(mes => {
                      const ocupado = mesesOcupados.includes(mes)
                      const selecionado = mesesSelecionados.includes(mes)
                      return (
                        <button
                          key={mes}
                          disabled={ocupado}
                          onClick={() => toggleMes(mes)}
                          className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all
                            ${ocupado ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' :
                              selecionado ? 'bg-blue-600 text-white border-blue-600' :
                              'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                          {mes}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Meses em cinza já foram escolhidos por outros participantes.</p>
                </div>
              )}

              {msg && <p className={`text-sm ${msg.includes('sucesso') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}

              <div className="flex gap-3">
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Confirmar'}
                </button>
                {jaConfigurou && (
                  <button onClick={() => setFase('ver')} className="text-sm text-gray-500 hover:underline px-2">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Linha do tempo */}
        {jaConfigurou && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Seus meses de recebimento</h2>
            <div className="space-y-2">
              {meusDados.mesesEscolhidos?.sort((a, b) => a - b).map(mes => (
                <div key={mes} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="font-semibold text-green-800">Mês {mes}</span>
                  </div>
                  <span className="text-green-700 font-bold">{fmt(potMensal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
