// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint File Uploader & Template Selector
// Drag-and-drop blueprint ingestion, format validation, and one-click demo presets
// ────────────────────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
} from 'lucide-react';
import { DEMO_BLUEPRINT_TEMPLATES } from '../../simulation/blueprintDemoTemplates';

interface BlueprintUploaderProps {
  onFileSelected: (file: File | string, templateId?: string) => void;
  isLoading: boolean;
}

export const BlueprintUploader: React.FC<BlueprintUploaderProps> = ({
  onFileSelected,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMessage(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload an industrial blueprint in PNG, JPG, or WebP format.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB. Please upload a compressed blueprint plan.');
      return;
    }

    onFileSelected(file);
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto font-mono text-gray-100 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="text-center space-y-1">
        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-ASSISTED FACILITY DIGITAL TWIN INGESTION</span>
        </div>
        <h2 className="text-xl font-bold text-gray-100">
          Upload Industrial Site Blueprint or Plant Layout
        </h2>
        <p className="text-xs text-gray-400 max-w-xl mx-auto">
          RESQ-AI automatically parses 2D blueprints to identify pressurized LPG vessels, storage tanks, process buildings, pipe racks, and roads to construct a simulation-ready 3D digital twin.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative ${
          dragActive
            ? 'border-cyan-400 bg-cyan-950/40 shadow-2xl scale-[1.01]'
            : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          onChange={handleChange}
          className="hidden"
        />

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400 shadow-xl">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-bold text-gray-200">
            Drag and drop your CAD / site plan blueprint here, or <span className="text-cyan-400 underline">browse</span>
          </div>
          <div className="text-[11px] text-gray-500">
            Supports high-resolution PNG, JPG, JPEG, and WebP (up to 25 MB)
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/80 border border-red-800 px-3 py-1.5 rounded-lg mt-2 animate-bounce">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Pre-Loaded Demo Templates */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-gray-400 font-bold border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1.5 text-cyan-300 uppercase text-[10px]">
            <Layers className="w-3.5 h-3.5" />
            OR SELECT A DETERMINISTIC HACKATHON DEMO TEMPLATE
          </span>
          <span className="text-[10px] text-emerald-400">100% Reliable • Zero API Outage Risk</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEMO_BLUEPRINT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => onFileSelected(tpl.thumbnailUrl, tpl.id)}
              className="p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/60 rounded-xl cursor-pointer transition-all flex items-start gap-3 group shadow-lg hover:scale-[1.02]"
            >
              <img
                src={tpl.thumbnailUrl}
                alt={tpl.name}
                className="w-20 h-16 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-950"
              />
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-gray-200 group-hover:text-cyan-300 transition-colors truncate">
                  {tpl.name}
                </div>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
                <div className="text-[9px] text-cyan-400 font-bold flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>LOAD TEMPLATE & PARSE ASSETS →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
