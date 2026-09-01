// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Physics Model Transparency Modal
// Complete mathematical formulas, empirical correlations & calculation pipeline
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { X, BookOpen, Atom, Wind, ShieldAlert, Cpu, Flame } from 'lucide-react';
import { ThreatResponse } from '../../simulation/types';

interface PhysicsModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  threatData: ThreatResponse | null;
}

export const PhysicsModelModal: React.FC<PhysicsModelModalProps> = ({
  isOpen,
  onClose,
  threatData,
}) => {
  if (!isOpen) return null;

  const isFacilityA = threatData?.facility_type === 'FACILITY_A_LPG';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Atom className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
                DER-02 PHYSICAL SIMULATION &amp; HAZARD MODEL
              </h2>
              <div className="text-xs text-gray-400">
                Analytical Formulations • CCPS 2010 • ALOHA 5.4.7 Calibrated
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-300 leading-relaxed">
          {/* 1. Architecture Flow Pipeline */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Computational Pipeline Architecture
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px] pt-1">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <div className="font-bold text-cyan-300">1. INPUTS</div>
                <div className="text-gray-500 mt-1">Geometry, Mass, Wind Speed/Dir</div>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <div className="font-bold text-amber-300">2. SOURCE MODEL</div>
                <div className="text-gray-500 mt-1">BLEVE Fireball / Pool Cylinder</div>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <div className="font-bold text-red-300">3. PROPAGATION</div>
                <div className="text-gray-500 mt-1">Moorhouse tau &amp; TNT Scaled Z</div>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <div className="font-bold text-purple-300">4. WIND KERNEL</div>
                <div className="text-gray-500 mt-1">Anisotropic Gaussian Warp</div>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <div className="font-bold text-emerald-300">5. 3D DIGITAL TWIN</div>
                <div className="text-gray-500 mt-1">Contours &amp; Ingress Route</div>
              </div>
            </div>
          </div>

          {/* 2. Scenario-Specific Equations */}
          {isFacilityA ? (
            <div className="space-y-4">
              <div className="border border-red-500/30 bg-red-950/20 p-4 rounded-xl space-y-3">
                <div className="font-bold text-red-400 uppercase text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Facility A: LPG Spherical Tank BLEVE &amp; Blast Physics
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <strong className="text-gray-200">1. Roberts (1982) Fireball Correlations:</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-cyan-300 border border-slate-800 space-y-1">
                      <div>Fireball Radius: r_f = 3.86 × M^0.325 [meters]</div>
                      <div>Fireball Duration: t_f = 0.825 × M^0.26 [seconds]</div>
                      <div>Total Stored Energy: E = M × ΔH_c [46.0 MJ/kg for LPG]</div>
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-200">2. Kingery–Bulmash (1985) Blast Overpressure:</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-amber-300 border border-slate-800 space-y-1">
                      <div>TNT Equivalent Mass: W_TNT = (E_stored × η) / E_TNT, where η = 0.04 - 0.10</div>
                      <div>Scaled Distance: Z = r / (W_TNT)^(1/3) [m / kg^(1/3)]</div>
                      <div>Peak Overpressure: log10(P_s) = Σ (c_i × (log10(Z))^i), i=0..9</div>
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-200">3. Atmospheric Transmissivity (Moorhouse 1982):</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-indigo-300 border border-slate-800">
                      τ(r) = exp(-0.09 × √r), &nbsp; Thermal Flux: q″(r) = SEP × (r_f / 2r)² × τ(r)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-amber-500/30 bg-amber-950/20 p-4 rounded-xl space-y-3">
                <div className="font-bold text-amber-400 uppercase text-xs flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Facility B: Petroleum Pool Fire Thermal Radiation
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <strong className="text-gray-200">1. Thomas (1963) Flame Height Correlation:</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-amber-300 border border-slate-800">
                      H = 42.0 × D × (m_dot / (ρ_a × √(g × D)))^0.61 [meters]
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-200">2. Welker &amp; Sliepcevich (1966) Wind Flame Tilt:</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-cyan-300 border border-slate-800">
                      U* = U_wind / √(g × D), &nbsp; θ_tilt = arctan(0.7 × (U*)^0.49)
                    </div>
                  </div>

                  <div>
                    <strong className="text-gray-200">3. Solid-Flame View Factor Radiation:</strong>
                    <div className="bg-slate-950 p-2.5 rounded-lg mt-1 font-mono text-emerald-300 border border-slate-800">
                      q″(r) = SEP × F_view × τ(r), &nbsp; where SEP = 45–65 kW/m²
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. CCPS 2010 Severity Classification Table */}
          <div>
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              CCPS 2010 Hazard Severity Thresholds
            </div>
            <table className="w-full text-left text-[11px] border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-950 text-gray-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-2">Zone Tier</th>
                  <th className="p-2">Thermal Radiation</th>
                  <th className="p-2">Blast Overpressure</th>
                  <th className="p-2">Physical Consequence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                <tr>
                  <td className="p-2 font-bold text-red-400">Zone 1 — Lethal</td>
                  <td className="p-2">&gt; 37.5 kW/m²</td>
                  <td className="p-2">&gt; 0.35 bar (5.0 psi)</td>
                  <td className="p-2 text-gray-400">100% lethality in 10s, structural demolition</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-orange-400">Zone 2 — Serious</td>
                  <td className="p-2">12.5 – 37.5 kW/m²</td>
                  <td className="p-2">0.07 – 0.35 bar</td>
                  <td className="p-2 text-gray-400">1% lethality in 10s, 1st degree burns, partial damage</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-yellow-400">Zone 3 — Injury</td>
                  <td className="p-2">4.7 – 12.5 kW/m²</td>
                  <td className="p-2">0.035 – 0.07 bar</td>
                  <td className="p-2 text-gray-400">Severe pain threshold at 15s, glass breakage</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-emerald-400">Zone 4 — Awareness</td>
                  <td className="p-2">1.6 – 4.7 kW/m²</td>
                  <td className="p-2">0.014 – 0.035 bar</td>
                  <td className="p-2 text-gray-400">Public boundary threshold, no discomfort</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition-colors"
          >
            CLOSE AUDIT PANEL
          </button>
        </div>
      </div>
    </div>
  );
};
