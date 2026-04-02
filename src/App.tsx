import { Routes, Route } from 'react-router-dom'
import { Login } from './components/Login'
import { Signup } from './components/Signup'
import { Home } from './components/Home'
import { ProfileEdit } from './components/ProfileEdit'
import { FlashcardList } from './components/FlashcardList'
import { FlashcardCreate } from './components/FlashcardCreate'
import { FlashcardEdit } from './components/FlashcardEdit'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<ProfileEdit />} />
      <Route path="/flashcards" element={<FlashcardList />} />
      <Route path="/flashcards/create" element={<FlashcardCreate />} />
      <Route path="/flashcards/edit/:title" element={<FlashcardEdit />} />
    </Routes>
  )
}

export default App
