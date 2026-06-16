import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDAXo5ouVHFJou5eYf3Vh0JohUoOcXHE2c",
  authDomain: "consorcio-14746.firebaseapp.com",
  projectId: "consorcio-14746",
  storageBucket: "consorcio-14746.firebasestorage.app",
  messagingSenderId: "1017703904259",
  appId: "1:1017703904259:web:73a9b9b5c1ab6517e5ca36",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
