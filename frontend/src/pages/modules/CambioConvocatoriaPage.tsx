import { useState } from 'react';
import FormSolicitudCambio from '../../components/cambio-convocatoria/FormSolicitudCambio';
import ListaPendientes from '../../components/cambio-convocatoria/ListaPendientes';
import HistorialCambios from '../../components/cambio-convocatoria/HistorialCambios';

type Tab = 'solicitar' | 'pendientes' | 'historial';

const TABS: { id: Tab; label: string }[] = [
  { id: 'solicitar', label: 'Solicitar' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'historial', label: 'Historial' },
];

export default function CambioConvocatoriaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('solicitar');

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2 mb-4">
        <h2 className="text-3xl font-headline font-extrabold tracking-tighter text-on-surface">
          Cambio de Convocatoria
        </h2>
      </div>

      <div className="flex gap-1 mb-6 border-b border-outline-variant/20 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold font-headline uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-on-surface-variant border-transparent hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'solicitar' && <FormSolicitudCambio />}
        {activeTab === 'pendientes' && <ListaPendientes />}
        {activeTab === 'historial' && <HistorialCambios />}
      </div>
    </div>
  );
}
