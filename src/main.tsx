import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './web/router'
import './styles.css'

const el = document.getElementById('root')
if (!el) throw new Error('#root が無い')

createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
