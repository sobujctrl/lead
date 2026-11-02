import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  Phone,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/lead';
import { SourceBadge, WhatsAppIcon } from '../common/SourceBadge';
import {
  formatBanglaDateTime,
  formatBanglaDateOnly,
  formatTaka,
  toBengaliNumerals,
  STATUS_LABELS,
} from '../../utils/formatters';
import { formatBdPhoneNumber, getWhatsAppLink, getPhoneCallLink } from '../../utils/phone';

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

interface ColumnConfig {
  id: LeadStatus;
  title: string;
  color: string;
  bgHeader: string;
  borderColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'new',
    title: 'নতুন',
    color: 'text-blue-700 dark:text-blue-300',
    bgHeader: 'bg-blue-50/80 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-900',
  },
  {
    id: 'contacted',
    title: 'যোগাযোগ করা হয়েছে',
    color: 'text-violet-700 dark:text-violet-300',
    bgHeader: 'bg-violet-50/80 dark:bg-violet-950/40',
    borderColor: 'border-violet-200 dark:border-violet-900',
  },
  {
    id: 'followup',
    title: 'ফলো-আপ',
    color: 'text-amber-700 dark:text-amber-300',
    bgHeader: 'bg-amber-50/80 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-900',
  },
  {
    id: 'won',
    title: 'কাস্টমার হয়েছে',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgHeader: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-900',
  },
  {
    id: 'lost',
    title: 'হারানো',
    color: 'text-slate-600 dark:text-slate-400',
    bgHeader: 'bg-slate-100/80 dark:bg-slate-800/40',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onSelectLead,
  onStatusChange,
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<LeadStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault();
    if (activeDropCol !== colId) {
      setActiveDropCol(colId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    setActiveDropCol(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      if (targetStatus === 'won') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onStatusChange(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

  // Move forward/backward shortcut
  const moveLeadToNextStatus = (lead: Lead, direction: 'forward' | 'backward') => {
    const statusOrder: LeadStatus[] = ['new', 'contacted', 'followup', 'won', 'lost'];
    const currentIndex = statusOrder.indexOf(lead.status);
    let nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const nextStatus = statusOrder[nextIndex];
      if (nextStatus === 'won') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onStatusChange(lead.id, nextStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
      {COLUMNS.map((column, colIdx) => {
        const columnLeads = leads.filter((l) => l.status === column.id);
        const columnTotalValue = columnLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
        const isDropTarget = activeDropCol === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col min-w-[280px] w-72 shrink-0 rounded-2xl border transition-all ${
              isDropTarget
                ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/20'
                : 'border-slate-200/80 bg-slate-100/60 dark:border-slate-800 dark:bg-[#1e293b]/40'
            }`}
          >
            {/* Column Header */}
            <div className={`p-3.5 border-b rounded-t-2xl ${column.bgHeader} ${column.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-sm ${column.color}`}>
                    {column.title}
                  </h3>
                  <span className="flex h-5 items-center justify-center rounded-full bg-white px-2 text-[11px] font-bold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200 tabular-nums">
                    {toBengaliNumerals(columnLeads.length)}
                  </span>
                </div>
              </div>

              {columnTotalValue > 0 && (
                <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  মোট সম্ভাব্য: <span className="text-slate-700 dark:text-slate-200">{formatTaka(columnTotalValue)}</span>
                </div>
              )}
            </div>

            {/* Column Body: Lead Cards */}
            <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[150px]">
              {columnLeads.length === 0 ? (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  এখানে কোনো লিড নেই
                </div>
              ) : (
                columnLeads.map((lead) => {
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => onSelectLead(lead)}
                      className="group relative cursor-grab active:cursor-grabbing rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-blue-400 hover:shadow-xs dark:border-slate-700/80 dark:bg-[#1e293b] dark:hover:border-blue-500"
                    >
                      {/* Top: Source & Move Shortcuts */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <SourceBadge source={lead.source} sources={lead.sources} size="sm" />
                        
                        {/* Quick move buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          {colIdx > 0 && (
                            <button
                              onClick={() => moveLeadToNextStatus(lead, 'backward')}
                              className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                              title="আগের ধাপে নিন"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                          )}
                          {colIdx < COLUMNS.length - 1 && (
                            <button
                              onClick={() => moveLeadToNextStatus(lead, 'forward')}
                              className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                              title="পরের ধাপে নিন"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Name & Phone */}
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {lead.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatBdPhoneNumber(lead.phone)}
                      </p>

                      {/* Product Interest */}
                      <div className="mt-1.5 line-clamp-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {lead.productInterest}
                      </div>

                      {/* Message preview */}
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        "{lead.message}"
                      </p>

                      {/* Card Footer: Follow-up & Quick contact */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {lead.followUpDate || lead.nextFollowUpDate ? (
                          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                            <Calendar className="h-3 w-3" />
                            {formatBanglaDateOnly(lead.followUpDate || lead.nextFollowUpDate)}
                          </span>
                        ) : (
                          <span>{formatBanglaDateTime(lead.createdAt)}</span>
                        )}

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={getWhatsAppLink(lead.phone, lead.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                          </a>
                          <a
                            href={getPhoneCallLink(lead.phone)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Call"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
