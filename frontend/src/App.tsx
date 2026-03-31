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
  const userName = session?.user?.email?.split('@')[0] || 'U';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Sidebar (Dark Premium) */}
      <aside className="fixed left-0 top-0 h-screen w-64 z-40 bg-on-secondary-fixed flex flex-col py-6 gap-2 shadow-2xl">
        <div className="px-6 mb-8">
          <h1 className="text-white text-xl font-black">Tablero RRHH</h1>
          <p className="font-headline uppercase tracking-widest text-[10px] font-bold text-slate-400 mt-1">Hospital Central</p>
        </div>
        <nav className="flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 active:translate-x-1 ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-primary to-primary-container shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <span className="font-headline uppercase tracking-widest text-[10px] font-bold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="px-4 mt-auto">
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500 mb-4 truncate text-center font-semibold tracking-wider font-headline">{session?.user?.email}</p>
            <button
              onClick={handleLogout}
              className="w-full bg-white/5 text-slate-300 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-error/20 hover:text-error transition-all border border-white/5"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* TopAppBar (Glassmorphism) */}
      <header className="fixed top-0 right-0 left-64 h-14 glass-header z-30 flex items-center justify-between px-8 font-headline antialiased text-sm tracking-tight border-b border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          {/* Breadcrumbs placeholder or global search space */}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full active:scale-95">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <div className="h-8 w-8 rounded-full overflow-hidden ml-2 flex items-center justify-center bg-primary text-white font-bold text-sm ring-2 ring-primary-fixed-dim/50 shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="ml-64 pt-14 min-h-screen flex flex-col">
        <div className="p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
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
