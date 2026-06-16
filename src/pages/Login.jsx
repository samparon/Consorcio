import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch {
      setErro('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0ea5e9 100%)' }}>

      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12 text-white">
        <div className="max-w-md">
          <div className="text-7xl mb-6">💰</div>
          <h1 className="text-5xl font-black mb-4 leading-tight">Consórcio<br/>Digital</h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Gerencie seu consórcio de forma simples e transparente. Escolha suas cotas e acompanhe tudo em tempo real.
          </p>
          <div className="mt-10 space-y-4">
            {['Escolha seu mês de recebimento', 'Acompanhe os pagamentos', 'Acesso seguro e rápido'].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="text-blue-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex flex-col justify-center items-center w-full lg:w-[480px] lg:flex-none px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-5xl mb-2">💰</div>
            <h1 className="text-3xl font-black text-white">Consórcio Digital</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">Bem-vindo de volta!</h2>
              <p className="text-gray-500 text-sm mt-1">Entre com sua conta para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-400"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-400"
                  placeholder="••••••••"
                />
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-60 shadow-lg shadow-blue-200"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)' }}>
                {loading ? 'Entrando...' : 'Entrar →'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Não tem acesso? Fale com o administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
