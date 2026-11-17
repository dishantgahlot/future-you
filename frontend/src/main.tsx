import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { NotificationProvider } from './contexts/NotificationContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UserProfileProvider>
            <SidebarProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </SidebarProvider>
          </UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)