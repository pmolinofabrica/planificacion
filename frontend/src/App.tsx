import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/auth/Login';
import PrivateRoute from './components/PrivateRoute';
import TurnosPage from './pages/modules/TurnosPage';
import ConvocatoriasPage from './pages/modules/ConvocatoriasPage';
import AgentesPage from './pages/modules/AgentesPage';
import PlanificacionPage from './pages/modules/PlanificacionPage';
import InasistenciasPage from './pages/modules/InasistenciasPage';
import DescansosPage from './pages/modules/DescansosPage';
import CertificadosPage from './pages/modules/CertificadosPage';
import CapacitacionesPage from './pages/modules/CapacitacionesPage';
import DispositivosPage from './pages/modules/DispositivosPage';
import CapacitacionesDispositivoPage from './pages/modules/CapacitacionesDispositivoPage';
import SaldosPage from './pages/modules/SaldosPage';
import { supabase } from './lib/supabase';

const NAV_ITEMS = [
  { path: '/convocatorias', label: 'Convocatorias' },
  { path: '/planificacion', label: 'Planificación' },
  { path: '/agentes', label: 'Agentes' },
  { path: '/inasistencias', label: 'Inasistencias' },
  { path: '/descansos', label: 'Descansos' },
  { path: '/certificados', label: 'Certificados' },
  { path: '/capacitaciones', label: 'Capacitaciones' },
  { path: '/caps_dispositivos', label: 'Caps Asignadas' },
  { path: '/dispositivos', label: 'Dispositivos' },
  { path: '/turnos', label: 'Turnos' },
  { path: '/saldos', label: 'Saldos' },
];

function Layout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Tablero</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión RRHH</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2 truncate">{session?.user?.email}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route
            path="/turnos"
            element={
              <Layout>
                <TurnosPage />
              </Layout>
            }
          />
          <Route
            path="/convocatorias"
            element={
              <Layout>
                <ConvocatoriasPage />
              </Layout>
            }
          />
          <Route
            path="/planificacion"
            element={
              <Layout>
                <PlanificacionPage />
              </Layout>
            }
          />
          <Route
            path="/agentes"
            element={
              <Layout>
                <AgentesPage />
              </Layout>
            }
          />
          <Route
            path="/inasistencias"
            element={
              <Layout>
                <InasistenciasPage />
              </Layout>
            }
          />
          <Route
            path="/descansos"
            element={
              <Layout>
                <DescansosPage />
              </Layout>
            }
          />
          <Route
            path="/certificados"
            element={
              <Layout>
                <CertificadosPage />
              </Layout>
            }
          />
          <Route
            path="/capacitaciones"
            element={
              <Layout>
                <CapacitacionesPage />
              </Layout>
            }
          />
          <Route
            path="/caps_dispositivos"
            element={
              <Layout>
                <CapacitacionesDispositivoPage />
              </Layout>
            }
          />
          <Route
            path="/dispositivos"
            element={
              <Layout>
                <DispositivosPage />
              </Layout>
            }
          />
          <Route
            path="/saldos"
            element={
              <Layout>
                <SaldosPage />
              </Layout>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/convocatorias" replace />} />
        <Route path="*" element={<Navigate to="/convocatorias" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
