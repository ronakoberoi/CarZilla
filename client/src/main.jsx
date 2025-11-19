import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { MotionConfig } from 'motion/react'
import { Auth0Provider } from '@auth0/auth0-react'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{ redirect_uri: window.location.origin, audience }}
  >
  <AppProvider>
    <MotionConfig viewport={{once: true}}>
    <App />
    </MotionConfig>
  </AppProvider>
  </Auth0Provider>
  </BrowserRouter>
)
