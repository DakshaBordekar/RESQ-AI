import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getActionPlan } from '../../services/api';
import { FileText, Printer, Download, CheckCircle, Shield } from 'lucide-react';

interface ActionPlanViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActionPlanViewer: React.FC<ActionPlanViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getActionPlan()
        .then((data) => setPlanData(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Operational Emergency Action Plan (EAP)" maxWidth="2xl">
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Synthesizing real-time operational directives &amp; telemetry...
        </div>
      ) : planData ? (
        <div className="space-y-4 text-xs select-text">
          {/* Header Banner */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-sm text-gray-100">{planData.title}</div>
                <div className="text-[11px] text-gray-400 font-mono">Disaster Operations Command Directive — Official Brief</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
                Print EAP
              </Button>
            </div>
          </div>

          {/* Markdown Tactical Narrative */}
          <div className="p-4 bg-surface-2/60 border border-gray-800 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-line text-gray-200">
            {planData.briefing_markdown}
          </div>

          {/* Active Dispatches Summary Table */}
          {planData.active_dispatches && planData.active_dispatches.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider text-gray-300">
                Deployed Asset Allocation Roster
              </div>
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-surface-2 text-gray-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Resource</th>
                      <th className="px-3 py-2">Target Incident</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Destination Hospital</th>
                      <th className="px-3 py-2">ETA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {planData.active_dispatches.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-2/30">
                        <td className="px-3 py-1.5 font-bold text-emerald-400 font-mono">{d.resource}</td>
                        <td className="px-3 py-1.5 truncate max-w-[140px]">{d.incident}</td>
                        <td className="px-3 py-1.5 font-semibold text-red-400">{d.priority}</td>
                        <td className="px-3 py-1.5 text-indigo-300">{d.hospital}</td>
                        <td className="px-3 py-1.5 font-mono">{d.eta} mins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
