import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initInstallCapture } from './utils/install'

// Must run before React mounts: the browser may offer the install prompt very early.
initInstallCapture()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
