import { Routes, Route } from 'react-router-dom'
import CompareLayout from './app/compare/layout'
import CompareLanding from './app/compare/page'
import NtmFlow from './app/compare/ntm/page'
import MagicFlow from './app/compare/magic/page'
import PdpFlow from './app/compare/pdp/page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CompareLayout />}>
        <Route index element={<CompareLanding />} />
        <Route path="ntm" element={<NtmFlow />} />
        <Route path="magic" element={<MagicFlow />} />
        <Route path="pdp" element={<PdpFlow />} />
      </Route>
    </Routes>
  )
}

export default App
