import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Sales from './pages/Sales'
import Leads from './pages/Leads'
import CTA from './pages/CTA'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="login" replace />,
      },
      {
        path: 'sales',
        element: <Sales />,
      },
      {
        path: 'leads',
        element: <Leads />,
      },
      {
        path: 'cta',
        element: <CTA />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="login" replace />,
  },
], {
  basename: '/sunny',
})

