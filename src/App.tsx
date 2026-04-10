import { Routes, Route } from 'react-router-dom'
import { Login } from './components/Login'
import { Signup } from './components/Signup'
import { Home } from './components/Home'
import { ProfileEdit } from './components/ProfileEdit'
import { EtymologyTest } from './components/EtymologyTest'
import { FlashcardList } from './components/FlashcardList'
import { WordList } from './components/WordList'
import { WordRegistration } from './components/WordRegistration'
import { LearnMode } from './components/LearnMode'
import { LearnScreen } from './components/LearnScreen'
import { TestMode } from './components/TestMode'
import { TestSelectionScreen } from './components/TestSelectionScreen'
import { TestRunScreen } from './components/TestRunScreen'
import { DatabaseScreen } from './components/DatabaseScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<ProfileEdit />} />
      <Route path="/etymology-test" element={<EtymologyTest />} />
      <Route path="/flashcards" element={<FlashcardList />} />
      <Route path="/flashcards/:title" element={<WordList />} />
      <Route path="/flashcards/:title/add" element={<WordRegistration />} />
      <Route path="/learn" element={<LearnMode />} />
      <Route path="/learn/:title" element={<LearnScreen />} />
      <Route path="/test" element={<TestMode />} />
      <Route path="/test/:title" element={<TestSelectionScreen />} />
      <Route path="/test/:title/run" element={<TestRunScreen />} />
      <Route path="/database" element={<DatabaseScreen />} />
    </Routes>
  )
}

export default App
