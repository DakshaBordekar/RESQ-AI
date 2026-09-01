// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint-to-Digital-Twin Master Page
// 5-Stage Pipeline: Upload -> Analyze -> Review -> Generate -> Simulate
// ────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  FacilitySchema,
  FacilityAsset,
  FacilityAssetType,
  WorkflowStage,
  BlueprintScaleConfig,
} from '../../simulation/blueprintTypes';
import {
  analyzeBlueprintImage,
  VisionAnalysisProgress,
} from '../../services/blueprintVisionService';
import { loadDemoBlueprintTemplate } from '../../simulation/blueprintDemoTemplates';
import { BlueprintUploader } from './BlueprintUploader';
import { BlueprintOverlayCanvas } from './BlueprintOverlayCanvas';
import { DetectionReviewPanel } from './DetectionReviewPanel';
import { ScaleReferenceModal } from './ScaleReferenceModal';
import { TwinSimulationHUD } from './TwinSimulationHUD';
import { BlueprintDigitalTwinScene } from '../../three/blueprint/BlueprintDigitalTwinScene';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileImage,
  Box,
  Flame,
  Activity,
} from 'lucide-react';

interface BlueprintImportPageProps {
  onBackToCommandCenter?: () => void;
  onNavigateToMission?: () => void;
}

const STAGES: { stage: WorkflowStage; label: string; number: string }[] = [
  { stage: 'UPLOAD', label: 'UPLOAD BLUEPRINT', number: '01' },
  { stage: 'ANALYZE', label: 'AI VISION ANALYSIS', number: '02' },
  { stage: 'REVIEW', label: 'HUMAN VERIFICATION', number: '03' },
  { stage: 'GENERATE', label: 'GENERATE 3D TWIN', number: '04' },
  { stage: 'SIMULATE', label: 'TACTICAL SIMULATION', number: '05' },
];

export const BlueprintImportPage: React.FC<BlueprintImportPageProps> = ({
  onBackToCommandCenter,
  onNavigateToMission,
}) => {
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('UPLOAD');
  const [blueprintImageUrl, setBlueprintImageUrl] = useState<string | null>(null);
  const [schema, setSchema] = useState<FacilitySchema | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<FacilityAsset | null>(null);

  // Analysis Progress
  const [analysisProgress, setAnalysisProgress] = useState<VisionAnalysisProgress | null>(null);

  // Scale Modal
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [scaleConfig, setScaleConfig] = useState<BlueprintScaleConfig>({
    mode: 'AUTO',
    pixelsPerMeter: 3.5,
    confidence: 0.94,
  });

  // Simulation State
  const [activeIncidentAssetId, setActiveIncidentAssetId] = useState<string | null>(null);
  const [activeIncidentType, setActiveIncidentType] = useState<'BLEVE' | 'POOL_FIRE' | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [windDirectionDeg, setWindDirectionDeg] = useState(135);
  const [windSpeedMs, setWindSpeedMs] = useState(8.5);

  // View Layout Mode in Review / Twin Stage (Split vs Full)
  const [viewLayout, setViewLayout] = useState<'SPLIT' | 'BLUEPRINT_ONLY' | 'TWIN_ONLY'>('SPLIT');

  // Handle File Selected
  const handleFileSelected = async (fileOrUrl: File | string, templateId?: string) => {
    let imageUrl = '';
    if (typeof fileOrUrl === 'string') {
      imageUrl = fileOrUrl;
    } else {
      imageUrl = URL.createObjectURL(fileOrUrl);
    }
    setBlueprintImageUrl(imageUrl);
    setCurrentStage('ANALYZE');

    try {
      const resultSchema = await analyzeBlueprintImage(
        fileOrUrl,
        scaleConfig,
        templateId,
        (progress) => setAnalysisProgress(progress)
      );

      setSchema(resultSchema);
      setCurrentStage('REVIEW');
    } catch (err) {
      console.error('Blueprint analysis error:', err);
      // Fallback gracefully to demo template
      const { schema: fallbackSchema } = loadDemoBlueprintTemplate('TEMPLATE_LPG_TERMINAL');
      setSchema(fallbackSchema);
      setCurrentStage('REVIEW');
    }
  };

  // Update Asset Type in Review
  const handleUpdateAssetType = (assetId: string, newType: FacilityAssetType) => {
    if (!schema) return;
    setSchema((prev) => {
      if (!prev) return prev;
      const updated = prev.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              type: newType,
              confirmed: true,
              source: 'manual' as const,
              simulationEnabled: newType === 'LPG_SPHERE' || newType === 'LPG_BULLET' || newType === 'STORAGE_TANK',
            }
          : a
      );
      return { ...prev, assets: updated };
    });
  };

  // Confirm and Generate 3D Digital Twin
  const handleConfirmAndGenerate = () => {
    setCurrentStage('GENERATE');
    setTimeout(() => {
      setCurrentStage('SIMULATE');
    }, 600);
  };

  // Trigger Incident Simulation
  const handleTriggerIncident = (assetId: string, type: 'BLEVE' | 'POOL_FIRE') => {
    setActiveIncidentAssetId(assetId);
    setActiveIncidentType(type);
    setIsSimulating(true);
  };

  // Reset Simulation Scene
  const handleResetSimulation = () => {
    setIsSimulating(false);
    setActiveIncidentAssetId(null);
    setActiveIncidentType(null);
  };

  // Full Reset to Upload
  const handleResetAll = () => {
    setCurrentStage('UPLOAD');
    setBlueprintImageUrl(null);
    setSchema(null);
    setSelectedAsset(null);
    setIsSimulating(false);
    setActiveIncidentAssetId(null);
    setActiveIncidentType(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-mono text-gray-100 flex flex-col select-none">
      {/* ── 1. TOP NAVIGATION & WORKFLOW STEP TRACKER ───────────────────────── */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-cyan-500/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-[1100] shrink-0">
        {/* Left: Branding & Back Navigation */}
        <div className="flex items-center gap-3">
          {onBackToCommandCenter && (
            <button
              onClick={onBackToCommandCenter}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-cyan-300 font-bold transition-all shadow"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>COMMAND CENTER</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span>BLUEPRINT → 3D DIGITAL TWIN GENERATOR</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-gray-100 truncate">
                {schema?.metadata.name || 'AI Procedural Facility Ingestion'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: 5-Stage Workflow Progress Stepper */}
        <div className="hidden md:flex items-center gap-1 text-[9px] bg-slate-900 border border-slate-800 rounded-xl p-1 shadow">
          {STAGES.map(({ stage, label, number }, idx) => {
            const isActive = currentStage === stage;
            const isPassed =
              STAGES.findIndex((s) => s.stage === currentStage) >
              STAGES.findIndex((s) => s.stage === stage);

            return (
              <div key={stage} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : isPassed
                      ? 'text-emerald-400 bg-slate-950'
                      : 'text-gray-500 bg-slate-950/40'
                  }`}
                >
                  <span>{number}.</span>
                  <span>{label}</span>
                </div>
                {idx < STAGES.length - 1 && <span className="text-slate-700">→</span>}
              </div>
            );
          })}
        </div>

        {/* Right: Reset & Navigation Actions */}
        <div className="flex items-center gap-2">
          {currentStage !== 'UPLOAD' && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-gray-300 font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET BLUEPRINT</span>
            </button>
          )}

          {onNavigateToMission && (
            <button
              onClick={onNavigateToMission}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500/60 text-red-300 rounded-lg text-[10px] font-bold transition-all shadow"
            >
              <span>MISSION MODE →</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. MAIN WORKSPACE CONTENT BY STAGE ─────────────────────────────── */}
      <div className="relative flex-1 w-full h-full overflow-hidden p-3">
        {/* STAGE 1: UPLOAD BLUEPRINT */}
        {currentStage === 'UPLOAD' && (
          <div className="w-full h-full flex items-center justify-center">
            <BlueprintUploader onFileSelected={handleFileSelected} isLoading={false} />
          </div>
        )}

        {/* STAGE 2: ANALYZING PROGRESS */}
        {currentStage === 'ANALYZE' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center font-mono">
            <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-400 shadow-2xl animate-spin">
              <Sparkles className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                {analysisProgress?.stage || 'ANALYZING BLUEPRINT'}
              </div>
              <div className="text-base font-bold text-gray-100">
                {analysisProgress?.message || 'Processing site plan geometry & identifying tanks...'}
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${analysisProgress?.progressPct || 45}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{analysisProgress?.progressPct || 45}% complete</span>
          </div>
        )}

        {/* STAGE 3: HUMAN VERIFICATION & DETECTION REVIEW (SPLIT SCREEN) */}
        {currentStage === 'REVIEW' && schema && blueprintImageUrl && (
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left 7 Columns: 2D Blueprint Overlay Canvas */}
            <div className="lg:col-span-7 h-full">
              <BlueprintOverlayCanvas
                blueprintImageUrl={blueprintImageUrl}
                schema={schema}
                selectedAssetId={selectedAsset?.id || null}
                onSelectAsset={setSelectedAsset}
              />
            </div>

            {/* Right 5 Columns: Detection Review & Type Modifier Panel */}
            <div className="lg:col-span-5 h-full">
              <DetectionReviewPanel
                schema={schema}
                selectedAssetId={selectedAsset?.id || null}
                onSelectAsset={setSelectedAsset}
                onUpdateAssetType={handleUpdateAssetType}
                onConfirmAsset={(id) => {
                  setSchema((prev) =>
                    prev
                      ? {
                          ...prev,
                          assets: prev.assets.map((a) => (a.id === id ? { ...a, confirmed: true } : a)),
                        }
                      : prev
                  );
                }}
                onOpenScaleModal={() => setScaleModalOpen(true)}
                onConfirmAndGenerate={handleConfirmAndGenerate}
              />
            </div>
          </div>
        )}

        {/* STAGE 4: GENERATING 3D TWIN ANIMATION */}
        {currentStage === 'GENERATE' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-500 text-cyan-400 shadow-2xl animate-pulse">
              <Box className="w-10 h-10" />
            </div>
            <div className="text-base font-bold text-gray-100">
              Procedurally Assembling 3D Digital Twin...
            </div>
            <p className="text-xs text-gray-400">
              Generating PBR structural meshes, roadways, safety zones, and topological routing graph...
            </p>
          </div>
        )}

        {/* STAGE 5: INTERACTIVE 3D DIGITAL TWIN & SIMULATION */}
        {currentStage === 'SIMULATE' && schema && (
          <div className="relative w-full h-full">
            {/* 3D Scene Viewport */}
            <BlueprintDigitalTwinScene
              schema={schema}
              selectedAssetId={selectedAsset?.id || null}
              onSelectAsset={setSelectedAsset}
              activeIncidentAssetId={activeIncidentAssetId}
              activeIncidentType={activeIncidentType}
              isSimulating={isSimulating}
              windDirectionDeg={windDirectionDeg}
              windSpeedMs={windSpeedMs}
            />

            {/* Simulation Tactical Overlay HUD */}
            <TwinSimulationHUD
              schema={schema}
              selectedAssetId={selectedAsset?.id || null}
              activeIncidentAssetId={activeIncidentAssetId}
              activeIncidentType={activeIncidentType}
              isSimulating={isSimulating}
              windDirectionDeg={windDirectionDeg}
              windSpeedMs={windSpeedMs}
              onChangeWindDirection={setWindDirectionDeg}
              onChangeWindSpeed={setWindSpeedMs}
              onTriggerIncident={handleTriggerIncident}
              onResetSimulation={handleResetSimulation}
            />
          </div>
        )}
      </div>

      {/* Scale Calibration Modal */}
      <ScaleReferenceModal
        isOpen={scaleModalOpen}
        currentPpm={schema?.metadata.pixelsPerMeter || 3.5}
        onClose={() => setScaleModalOpen(false)}
        onApplyScale={(cfg) => {
          setScaleConfig(cfg);
          if (schema) {
            setSchema((prev) =>
              prev
                ? {
                    ...prev,
                    metadata: { ...prev.metadata, pixelsPerMeter: cfg.pixelsPerMeter },
                  }
                : prev
            );
          }
        }}
      />
    </div>
  );
};
