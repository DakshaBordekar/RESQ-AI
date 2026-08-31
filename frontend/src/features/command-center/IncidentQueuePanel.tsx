import React, { useState } from 'react';
import { Incident, PriorityTier } from '../../types';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { Search, Users, HeartPulse, AlertCircle } from 'lucide-react';

interface IncidentQueuePanelProps {
  incidents: Incident[];
  selectedIncidentId?: string;
  onSelectIncident: (inc: Incident) => void;
}

export const IncidentQueuePanel: React.FC<IncidentQueuePanelProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}) => {
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = incidents.filter((inc) => {
    const matchesTier = filterTier === 'ALL' || inc.priority_tier === filterTier;
    const matchesSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.location_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-surface-1 border-r border-gray-800 w-80 lg:w-96 flex-shrink-0 select-none">
      {/* Header & Filter Bar */}
      <div className="p-3 border-b border-gray-800 space-y-2.5 bg-surface-2/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-priority-critical" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Incident Triage Queue</span>
          </div>
          <span className="text-xs font-mono font-semibold text-gray-400 bg-surface-2 px-2 py-0.5 rounded border border-gray-700">
            {incidents.length} Active
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter by location or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-2 border border-gray-700 rounded text-xs pl-8 pr-3 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Tier Pills */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`flex-1 py-1 rounded font-semibold transition ${
                filterTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-2 text-gray-400 hover:text-gray-200 hover:bg-surface-3'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60 p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No incidents match current filters.
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-500/10'
                    : 'bg-surface-2/40 border-gray-800/80 hover:bg-surface-2 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-xs font-semibold text-gray-100 line-clamp-1 flex-1">
                    {inc.title}
                  </div>
                  <PriorityBadge tier={inc.priority_tier} score={inc.calculated_priority} size="sm" />
                </div>

                <div className="text-[11px] text-gray-400 mb-2 line-clamp-1">
                  📍 {inc.location_name}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-500" />
                      {inc.people_affected} (V:{inc.vulnerable_people})
                    </span>
                    {inc.medical_need && (
                      <span className="flex items-center gap-1 text-red-400">
                        <HeartPulse className="w-3 h-3 text-red-400" />
                        Med
                      </span>
                    )}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    inc.status === 'DISPATCHED' ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {inc.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
