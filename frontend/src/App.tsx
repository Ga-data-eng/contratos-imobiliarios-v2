import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { Carregando } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contratos from './pages/Contratos';
import ContratoForm from './pages/ContratoForm';
import ContratoDetalhe from './pages/ContratoDetalhe';
import Assinaturas from './pages/Assinaturas';
import Historico from './pages/Historico';
import Protocolo from './pages/Protocolo';
import Cadastros from './pages/Cadastros';
import Auditoria from './pages/Auditoria';

function Protegido({ children }: { children: JSX.Element }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando texto="Verificando sessão..." />;
  if (!usuario) return <Navigate to="/login" state={{ de: local.pathname }} replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <Protegido>
            <Dashboard />
          </Protegido>
        }
      />
      <Route
        path="/contratos"
        element={
          <Protegido>
            <Contratos />
          </Protegido>
        }
      />
      <Route
        path="/contratos/novo"
        element={
          <Protegido>
            <ContratoForm />
          </Protegido>
        }
      />
      <Route
        path="/contratos/:id"
        element={
          <Protegido>
            <ContratoDetalhe />
          </Protegido>
        }
      />
      <Route
        path="/contratos/:id/editar"
        element={
          <Protegido>
            <ContratoForm />
          </Protegido>
        }
      />
      <Route
        path="/contratos/:id/assinaturas"
        element={
          <Protegido>
            <Assinaturas />
          </Protegido>
        }
      />
      <Route
        path="/contratos/:id/historico"
        element={
          <Protegido>
            <Historico />
          </Protegido>
        }
      />
      <Route
        path="/protocolo"
        element={
          <Protegido>
            <Protocolo />
          </Protegido>
        }
      />
      <Route
        path="/cadastros"
        element={
          <Protegido>
            <Cadastros />
          </Protegido>
        }
      />
      <Route
        path="/auditoria"
        element={
          <Protegido>
            <Auditoria />
          </Protegido>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
