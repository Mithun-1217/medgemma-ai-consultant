import React from 'react';
import { Heart, Activity, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { VitalSigns, Patient } from '../types';

interface PatientCardProps {
  patient: Patient;
  vitals: VitalSigns | null;
  isActive: boolean;
  onClick: () => void;
}

export default function PatientCard({ patient, vitals, isActive, onClick }: PatientCardProps) {
  const getStatusColor = (vitals: VitalSigns | null) => {
    if (!vitals) return 'bg-white opacity-50';
    if (vitals.heartRate > 100 || vitals.spo2 < 92) return 'bg-[#FAF6F2] border-[#E8DED3]';
    return 'bg-white border-natural-border';
  };

  const getUrgencyBadge = (vitals: VitalSigns | null) => {
    if (!vitals) return null;
    if (vitals.heartRate > 100 || vitals.spo2 < 92) {
      return <span className="px-2 py-0.5 rounded-full bg-[#E8B3B8]/20 text-[#C42B1C] text-[10px] font-bold uppercase tracking-widest">Alert</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-sage-light text-green-700 text-[10px] font-bold uppercase tracking-widest">Stable</span>;
  };

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-[32px] border transition-all cursor-pointer group ${isActive ? 'ring-2 ring-sage-primary border-transparent shadow-md' : 'hover:border-sage-muted shadow-sm'} ${getStatusColor(vitals)}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-serif font-bold text-sage-primary italic text-lg leading-tight group-hover:text-black transition-colors">{patient.name}</h3>
          <p className="text-[10px] text-sage-muted font-bold uppercase tracking-widest mt-1">{patient.id}</p>
        </div>
        {getUrgencyBadge(vitals)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-natural-border/30">
          <Heart size={12} className="text-earth-accent mb-2" />
          <span className="text-base font-medium text-sage-primary leading-none">{vitals?.heartRate ?? '--'}</span>
          <span className="text-[9px] text-sage-muted uppercase font-bold tracking-tighter mt-1">BPM</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-natural-border/30">
          <Activity size={12} className="text-sage-primary mb-2" />
          <span className="text-base font-medium text-sage-primary leading-none">{vitals?.bloodPressure.split('/')[0] ?? '--'}</span>
          <span className="text-[9px] text-sage-muted uppercase font-bold tracking-tighter mt-1">SYS</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-natural-border/30">
          <Wind size={12} className="text-sage-muted mb-2" />
          <span className="text-base font-medium text-sage-primary leading-none">{vitals?.spo2 ?? '--'}</span>
          <span className="text-[9px] text-sage-muted uppercase font-bold tracking-tighter mt-1">SpO2</span>
        </div>
      </div>
    </div>
  );
}
