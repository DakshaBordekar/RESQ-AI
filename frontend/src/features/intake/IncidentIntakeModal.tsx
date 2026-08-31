import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { analyzeTextAI, createIncident } from '../../services/api';
import { Sparkles, CheckCircle, AlertCircle, MapPin, Users, HeartPulse } from 'lucide-react';
import { Incident } from '../../types';

interface IncidentIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: () => void;
}

export const IncidentIntakeModal: React.FC<IncidentIntakeModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
}) => {
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Preset Distress Templates for instant demo testing
  const sampleTemplates = [
    {
      label: 'Flood: Senior Citizens on Terrace',
      text: 'My grandmother and 2 other senior citizens are trapped on the terrace near Velachery Main Road. Water level is 5ft and rising quickly.',
    },
    {
      label: 'Medical: Dialysis Crisis',
      text: 'Critical dialysis patient without power near Saidapet Canal Bank Road. Difficulty breathing, needs immediate ambulance transfer.',
    },
    {
      label: 'Structural: Building Collapse',
      text: 'Old residential wall partially collapsed near Mylapore Tank. 4 people trapped under debris, 1 with bleeding head injury.',
    },
  ];

  const handleAnalyze = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeTextAI(textToParse);
      setExtracted(data);
    } catch (err: any) {
      setError(err.message || 'AI extraction failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveIncident = async () => {
    if (!extracted) return;
    setIsSaving(true);
    setError(null);
    try {
      await createIncident({
        title: extracted.summary || `Emergency at ${extracted.location_name}`,
        raw_text: rawText,
        location_name: extracted.location_name,
        latitude: extracted.latitude,
        longitude: extracted.longitude,
        hazard_type: extracted.hazard_type,
        people_affected: extracted.people_affected,
        vulnerable_people: extracted.vulnerable_people,
        vulnerability_flags: extracted.vulnerability_flags || [],
        medical_need: extracted.medical_need,
        mobility_status: extracted.mobility_status,
        urgency: extracted.urgency,
        status: 'TRIAGED',
      });
      onIncidentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to stage incident.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Incident Ingestion & Extraction" maxWidth="2xl">
      <div className="space-y-4">
        {/* Preset Templates */}
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Quick Distress Templates (Live Demo)
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleTemplates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setRawText(tpl.text);
                  handleAnalyze(tpl.text);
                }}
                className="text-xs bg-surface-2 hover:bg-surface-3 border border-gray-700 text-gray-300 px-2.5 py-1 rounded transition"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Freeform Distress Text Area */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">
            Citizen Distress Report / Emergency Call Audio Transcript
          </label>
          <textarea
            rows={3}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw emergency message, audio transcription, or citizen report text..."
            className="w-full bg-surface-2 border border-gray-700 rounded-lg p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAnalyze(rawText)}
            isLoading={isAnalyzing}
            icon={<Sparkles className="w-4 h-4 text-amber-300" />}
          >
            Extract Structured Parameters (AI)
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Extracted Schema Preview */}
        {extracted && (
          <div className="p-4 bg-surface-2/70 border border-blue-500/40 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Verified AI Structured Schema
              </div>
              <span className="text-[10px] font-mono bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded border border-blue-700">
                Confidence: {(extracted.confidence_score * 100).toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Location</span>
                <span className="font-semibold text-gray-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> {extracted.location_name}
                </span>
                <span className="text-[10px] font-mono text-gray-400">({extracted.latitude.toFixed(4)}, {extracted.longitude.toFixed(4)})</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Hazard &amp; Urgency</span>
                <span className="font-semibold text-orange-400 mt-0.5 block">
                  {extracted.hazard_type} — {extracted.urgency}
                </span>
                <span className="text-[10px] font-semibold text-red-400">Severity: {extracted.severity}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Victims Count</span>
                <span className="font-semibold text-gray-200 flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> {extracted.people_affected} affected (Vulnerable: {extracted.vulnerable_people})
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Medical &amp; Mobility</span>
                <span className="font-semibold text-gray-200 flex items-center gap-1 mt-0.5">
                  <HeartPulse className="w-3.5 h-3.5 text-red-400" />
                  {extracted.medical_need ? 'Critical Medical Flag' : 'No Immediate Trauma'}
                </span>
                <span className="text-[10px] text-gray-400 block">Mobility: {extracted.mobility_status}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-700">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveIncident}
                isLoading={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                ✓ Stage into Global Triage Queue
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
