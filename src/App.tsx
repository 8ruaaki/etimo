import { Routes, Route } from 'react-router-dom'
import { Login } from './components/Login'
import { Signup } from './components/Signup'
import { Home } from './components/Home'
import { ProfileEdit } from './components/ProfileEdit'
import { EtymologyTest } from './components/EtymologyTest'
import { FlashcardList } from './components/FlashcardList'
import { WordRegistration } from './components/WordRegistration'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<ProfileEdit />} />
      <Route path="/etymology-test" element={<EtymologyTest />} />
      <Route path="/flashcards" element={<FlashcardList />} />
      <Route path="/flashcards/:title/add" element={<WordRegistration />} />
    </Routes>
  )
}

export default App
