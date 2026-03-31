import { useState } from 'react';
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

// Menu grouped according to requirements
const NAV_GROUPS = [
  // Group 1: Planificación, Convocatoria, Descansos, Saldos
  [
    { path: '/planificacion', label: 'Planificación' },
    { path: '/convocatorias', label: 'Convocatorias' },
    { path: '/descansos', label: 'Descansos' },
    { path: '/saldos', label: 'Saldos' },
  ],
  // Group 2: Inasistencias, Certificados
  [
    { path: '/inasistencias', label: 'Inasistencias' },
    { path: '/certificados', label: 'Certificados' },
  ],
  // Group 3: Capacitaciones, Caps Disp
  [
    { path: '/capacitaciones', label: 'Capacitaciones' },
    { path: '/caps_dispositivos', label: 'Caps Disp' },
  ],
  // Group 4: Dispositivos, Turnos, Agentes
  [
    { path: '/dispositivos', label: 'Dispositivos' },
    { path: '/turnos', label: 'Turnos' },
    { path: '/agentes', label: 'Agentes' },
  ],
];

function Layout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-on-secondary-fixed z-30 flex items-center px-4 shadow-md">
        <button
          onClick={toggleSidebar}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="ml-4 flex flex-col">
          <h1 className="text-white text-lg font-black leading-tight">El Molino</h1>
          <p className="font-headline uppercase tracking-widest text-[8px] font-bold text-slate-400">Residencias</p>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Dark Premium) */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 z-50 bg-on-secondary-fixed flex flex-col py-6 gap-2 shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 mb-8 flex justify-between items-center md:block">
          <div>
            <h1 className="text-white text-2xl font-black">El Molino</h1>
            <p className="font-headline uppercase tracking-widest text-[10px] font-bold text-slate-400 mt-1">Residencias Culturales</p>
          </div>
          <button
            onClick={closeSidebar}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            {NAV_GROUPS.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className={`flex flex-col gap-1 pb-4 ${
                  groupIdx !== NAV_GROUPS.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                {group.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
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

      {/* Main content (scrolling area) */}
      <main className="md:ml-64 pt-16 md:pt-0 h-screen overflow-y-auto flex flex-col transition-all duration-300">
        <div className="p-4 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
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
