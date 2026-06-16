import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDAXo5ouVHFJou5eYf3Vh0JohUoOcXHE2c",
  authDomain: "consorcio-14746.firebaseapp.com",
  projectId: "consorcio-14746",
  storageBucket: "consorcio-14746.firebasestorage.app",
  messagingSenderId: "1017703904259",
  appId: "1:1017703904259:web:73a9b9b5c1ab6517e5ca36",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

try {
  const cred = await createUserWithEmailAndPassword(auth, 'guilhermesampaiosantos13@gmail.com', '130987')
  await setDoc(doc(db, 'usuarios', cred.user.uid), {
    nome: 'Guilherme (Admin)',
    email: 'guilhermesampaiosantos13@gmail.com',
    role: 'admin',
    criadoEm: Date.now(),
  })
  console.log('✅ Admin criado com sucesso! UID:', cred.user.uid)
} catch (err) {
  console.error('❌ Erro:', err.message)
}
process.exit(0)
