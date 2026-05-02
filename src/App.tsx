import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { 
  Heart, 
  Activity, 
  Wind, 
  LayoutGrid, 
  Users, 
  Bell, 
  Search, 
  Plus, 
  Settings, 
  HelpCircle,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Camera,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { VitalSigns, Patient, VideoCallRecord } from './types';
import PatientCard from './components/PatientCard';
import VitalsChart from './components/VitalsChart';
import MedGemmaChat from './components/MedGemmaChat';
import { getHealthcareInsights } from './lib/gemini';

const INITIAL_PATIENTS: Patient[] = [
  { 
    id: 'MC-4029', 
    name: 'Robert Chen', 
    condition: 'Post-Op Recovery', 
    age: 45, 
    sex: 'M', 
    room: '402-B',
    history: ['Hypertension', 'Lisinopril 10mg daily'],
    medications: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily (AM)', adherence: 98, status: 'Active' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'Daily (PM)', adherence: 100, status: 'Active' }
    ],
    appointments: [],
    videoCalls: [
      { id: 'vc1', doctorName: 'Dr. Sarah Jennings', timestamp: 'Oct 28, 2024 • 14:15', duration: '12:45' }
    ],
    stabilityScore: 92,
    stabilityTrend: 'Stable'
  },
  { 
    id: 'MC-3155', 
    name: 'Elena Rodriguez', 
    condition: 'Chronic Hypertension', 
    age: 62, 
    sex: 'F', 
    room: '315-A',
    history: ['Diabetes Type 2', 'Metformin 500mg BID'],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'BID (AM/PM)', adherence: 92, status: 'Active' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Daily (PM)', adherence: 74, status: 'Monitor' }
    ],
    appointments: [],
    videoCalls: [],
    stabilityScore: 78,
    stabilityTrend: 'Improving'
  },
  { 
    id: 'MC-8821', 
    name: 'Samuel L. Jackson', 
    condition: 'COPD Management', 
    age: 72, 
    sex: 'M', 
    room: 'ICU-08',
    history: ['Smoking history 40 years', 'Oxygen dependent'],
    medications: [
      { name: 'Albuterol', dosage: '90mcg', frequency: 'PRN', adherence: 85, status: 'Active' },
      { name: 'Prednisone', dosage: '5mg', frequency: 'Daily', adherence: 100, status: 'Active' }
    ],
    appointments: [],
    videoCalls: [],
    stabilityScore: 64,
    stabilityTrend: 'Stable'
  },
  { 
    id: 'MC-2291', 
    name: 'Linda Garrison', 
    condition: 'Cardiac Arrhythmia', 
    age: 58, 
    sex: 'F', 
    room: '229-C',
    history: ['Atrial Fibrillation', 'Warfarin'],
    medications: [
      { name: 'Warfarin', dosage: '5mg', frequency: 'Daily (PM)', adherence: 96, status: 'Active' },
      { name: 'Bisoprolol', dosage: '2.5mg', frequency: 'Daily (AM)', adherence: 91, status: 'Active' }
    ],
    appointments: [],
    videoCalls: [],
    stabilityScore: 88,
    stabilityTrend: 'Declining'
  }
];

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(INITIAL_PATIENTS[0].id);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, VitalSigns[]>>({});
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'chat'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // UI States
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState<{ doctor: string; patientId: string } | null>(null);

  // Dashboard Layout State
  const [layout, setLayout] = useState({
    vitals: [
      { id: 'hr', label: 'Heart Rate', visible: true, order: 0 },
      { id: 'bp', label: 'Blood Pressure', visible: true, order: 1 },
      { id: 'spo2', label: 'SpO2 Level', visible: true, order: 2 },
      { id: 'stability', label: 'Stability Index', visible: true, order: 3 },
    ],
    sections: [
      { id: 'vitals-trends', label: 'Vitals Trends', visible: true, order: 0 },
      { id: 'stability-markers', label: 'Stability Markers', visible: true, order: 1 },
      { id: 'medication-table', label: 'Medication Table', visible: true, order: 2 },
      { id: 'appointments', label: 'Upcoming Protocols', visible: true, order: 3 },
      { id: 'insight-panel', label: 'AI Insight Panel', visible: true, order: 4 },
    ]
  });

  const toggleVital = (id: string) => {
    setLayout(prev => ({
      ...prev,
      vitals: prev.vitals.map(v => v.id === id ? { ...v, visible: !v.visible } : v)
    }));
  };

  const toggleSection = (id: string) => {
    setLayout(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
    }));
  };

  const moveItem = (type: 'vitals' | 'sections', id: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const items = [...prev[type]];
      const index = items.findIndex(item => item.id === id);
      if (direction === 'up' && index > 0) {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
      } else if (direction === 'down' && index < items.length - 1) {
        [items[index + 1], items[index]] = [items[index], items[index + 1]];
      }
      return {
        ...prev,
        [type]: items.map((item, i) => ({ ...item, order: i }))
      };
    });
  };

  // Form State for Add Patient
  const [newPatient, setNewPatient] = useState({ name: '', condition: '', room: '', age: '' });

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId)!, [patients, selectedPatientId]
  );

  const currentVitals = useMemo(() => {
    const history = vitalsHistory[selectedPatientId] || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }, [vitalsHistory, selectedPatientId]);

  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('vitals_update', (vitals: VitalSigns) => {
      setLastSyncTime(new Date());

      // Cardiovascular Stability Calculation
      // Basic heuristic: Higher score if HR is near 75 and SpO2 is high
      const calculateStability = (v: VitalSigns) => {
        const hrRef = 75;
        const spo2Ref = 98;
        const hrDev = Math.abs(v.heartRate - hrRef) / hrRef;
        const spo2Dev = Math.max(0, (spo2Ref - v.spo2) / spo2Ref);
        const score = Math.max(0, Math.min(100, Math.round(100 - (hrDev * 40 + spo2Dev * 120))));
        return score;
      };

      const newScore = calculateStability(vitals);

      setPatients(prev => prev.map(p => {
        if (p.id === vitals.patientId) {
          const oldScore = p.stabilityScore || INITIAL_PATIENTS.find(ip => ip.id === p.id)?.stabilityScore || 70;
          let trend: 'Stable' | 'Improving' | 'Declining' = 'Stable';
          if (newScore > oldScore + 2) trend = 'Improving';
          if (newScore < oldScore - 2) trend = 'Declining';
          
          return { 
            ...p, 
            stabilityScore: newScore,
            stabilityTrend: trend
          };
        }
        return p;
      }));

      setVitalsHistory(prev => {
        const history = prev[vitals.patientId] || [];
        const newHistory = [...history, vitals].slice(-20); // Keep last 20 readings
        return {
          ...prev,
          [vitals.patientId]: newHistory
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleGetAiInsight = async () => {
    if (!currentVitals || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const insight = await getHealthcareInsights(currentVitals, selectedPatient.condition);
      setAiInsights(prev => ({ ...prev, [selectedPatientId]: insight || '' }));

      if (insight && insight.includes('INITIATE_EMERGENCY_VIDEO_CONSULT')) {
        setIsEmergencyActive(true);
        // Dispatch call after a short delay for dramatic effect/realism
        setTimeout(() => {
          setActiveVideoCall({ 
            doctor: 'Dr. Sarah Jennings (Critical Response Unit)', 
            patientId: selectedPatientId 
          });
        }, 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-natural-bg font-sans text-natural-text overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-natural-border flex flex-col shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-sage-primary rounded-full flex items-center justify-center text-white font-serif italic text-xl shadow-sm">
              M
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold tracking-tight leading-none">MedGemma</h1>
              <p className="text-[10px] font-bold text-sage-muted uppercase tracking-widest mt-1">Health Hub</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-bold ${view === 'dashboard' ? 'bg-sage-light text-sage-primary shadow-sm' : 'text-sage-muted hover:bg-sage-light/50'}`}
            >
              <LayoutGrid size={16} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-bold ${view === 'chat' ? 'bg-sage-light text-sage-primary shadow-sm' : 'text-sage-muted hover:bg-sage-light/50'}`}
            >
              <MessageSquare size={16} />
              <span>Consultant</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-6">
          <div className={`p-6 rounded-[24px] transition-all duration-500 ${isConnected ? 'bg-sage-primary text-natural-bg shadow-lg shadow-sage-primary/20' : 'bg-natural-bg text-sage-muted border border-natural-border shadow-inner'} relative overflow-hidden`}>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <BrainCircuit size={18} className={isConnected ? "text-white/80" : "text-sage-muted/50"} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live Connect</span>
            </div>
            <p className={`text-[11px] mb-4 leading-relaxed relative z-10 ${isConnected ? 'text-white/70' : 'text-sage-muted/60 font-serif italic'}`}>
              {isConnected ? 'Syncing vital streams from watch wearable.' : 'Awaiting telemetry handshake...'}
            </p>
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden relative z-10">
              <div className={`h-full bg-white transition-all duration-1000 ${isConnected ? 'w-full animate-pulse opacity-60' : 'w-0'}`}></div>
            </div>
          </div>

          <div className="space-y-1">
            <button 
              onClick={() => setShowLayoutSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sage-muted hover:text-sage-primary transition-colors text-xs font-semibold uppercase tracking-widest"
            >
              <LayoutGrid size={16} />
              <span>Customize Layout</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sage-muted hover:text-sage-primary transition-colors text-xs font-semibold uppercase tracking-widest"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-transparent flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center gap-8 flex-1">
            <h2 className="text-[11px] font-bold text-sage-muted uppercase tracking-[0.2em]">
              {view === 'dashboard' ? 'Active Monitoring' : 'Personalized Insights'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-4 px-4 py-2 rounded-full border shadow-sm transition-all ${isConnected ? 'bg-white border-natural-border' : 'bg-error/10 border-error/20'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-error'}`}></div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isConnected ? 'text-sage-primary' : 'text-error'}`}>
                {isConnected ? 'Watch Connected' : 'Watch Offline'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-serif font-bold text-sage-primary italic leading-none">Dr. Mitchell</p>
                <p className="text-[10px] text-sage-muted uppercase tracking-widest mt-1">Chief Resident</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-natural-border p-0.5 overflow-hidden transition-all group-hover:border-sage-primary shadow-sm bg-white">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkITEzxQ9f87DWyWM4_VY3aeCaKEpYMWFuLCr5Op2iWc62B34v5MlGgwPX145yMG5o7TPLm6nP_ygtRU6YE-uqGaaGpF6yruZdOX2G8dWolsRgzY4oZE-v_gHrwfC0eFvOLOeEWoOwd1iHJ9XHEgHzE6wwPBwEKXHrz1WP21xwm39Gyj-BdfM66exh4LaekKr9deFayUY0gyQ3MrE7PGSE11EmTAqU0cMOF9i2jKbc8sEEFdx7O1maGZru_CBw9ZjpZpJGScyrk-Dc" 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View Canvas */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {view === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full flex p-10 gap-10 overflow-hidden"
              >
                {/* Left: Patient Grid */}
                <div className="w-80 flex flex-col shrink-0 gap-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-bold text-sage-muted uppercase tracking-[0.2em]">Active Records</h3>
                    <button 
                      onClick={() => setShowAddPatientModal(true)}
                      className="text-sage-primary hover:text-sage-muted text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      + Add Resident
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                    {patients.map(patient => (
                      <PatientCard 
                        key={patient.id}
                        patient={patient}
                        vitals={vitalsHistory[patient.id]?.length ? vitalsHistory[patient.id][vitalsHistory[patient.id].length - 1] : null}
                        isActive={selectedPatientId === patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Right: Patient Detal / Vitals */}
                <div className="flex-1 flex flex-col gap-10 min-w-0 overflow-y-auto pr-6 custom-scrollbar">
                  {/* Patient Bio & Alerts */}
                  <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-sm shrink-0 relative overflow-hidden">
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-sage-light rounded-full blur-[80px] opacity-30"></div>
                    
                    <div className="relative z-10 flex justify-between items-start mb-10">
                      <div className="flex gap-8">
                        <div className="w-24 h-24 rounded-3xl p-1 bg-white border border-natural-border shadow-sm overflow-hidden flex-shrink-0">
                          <img 
                            src={`https://lh3.googleusercontent.com/aida-public/AB6AXuBnsrzDvB8I8PLPSwV7SgnSOpcDhsWenWxFLSvrHzj8YA0k7GqDiXAICTfMxMKIzx2XmnPR2Uy_4FTJ1OaEV6dJigA40e7aQTAABCzdCxkdtrVdMDmwi2Hs9e_W3CYLCRa_G9rGGGK9oS1BifWW-dPlMZR4jsBE7EsVFe7c2xO7O_JKWioUoQzfW1-Cgpw2b_oJbsbJQMsP7Q9DtqgqMu0jxSprTC2b9yY4v0ZJvUK_-31Uq4Hr9mIFLqM6hWWmW9EoK5rXkKrvNeh7`} 
                            alt={selectedPatient.name} 
                            className="w-full h-full object-cover rounded-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-4">
                            <h2 className="text-4xl font-serif font-bold text-sage-primary italic tracking-tight">{selectedPatient.name}</h2>
                            <span className="px-3 py-1 rounded-full bg-sage-light text-sage-primary text-[10px] font-bold uppercase tracking-widest border border-natural-border">{selectedPatient.room}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-sage-muted mt-3 font-medium">
                            <span className="bg-white px-2 py-0.5 rounded border border-natural-border">{selectedPatient.age} Years</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-natural-border">{selectedPatient.sex === 'M' ? 'Male' : 'Female'}</span>
                            <span className="italic font-serif text-sage-primary opacity-70">"{selectedPatient.condition}"</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-6">
                            {selectedPatient.history.map((tag, i) => (
                              <span key={i} className="px-3 py-1 bg-natural-bg text-sage-muted text-[10px] rounded-full border border-natural-border font-bold uppercase tracking-widest">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowHistory(true)}
                          className="px-6 py-3 border border-natural-border rounded-full text-xs font-bold text-sage-muted uppercase tracking-widest hover:bg-natural-bg transition-all shadow-sm bg-white"
                        >
                          History
                        </button>
                        <button 
                          onClick={() => setIsEmergencyActive(!isEmergencyActive)}
                          className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-md transition-all ${isEmergencyActive ? 'bg-error text-white animate-pulse' : 'bg-sage-primary text-white shadow-sage-primary/20 hover:opacity-90'}`}
                        >
                          {isEmergencyActive ? 'ACTIVE ALARM' : 'Emergency'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 relative z-10">
                      {layout.vitals
                        .filter(v => v.visible)
                        .map((vConfig) => {
                          const statMap: Record<string, any> = {
                            hr: { label: 'Heart Rate', value: currentVitals?.heartRate || '78', unit: 'bpm', icon: Heart, color: 'text-sage-primary', bg: 'bg-sage-light' },
                            bp: { label: 'Blood Pressure', value: currentVitals?.bloodPressure || '--', unit: 'mmHg', icon: Activity, color: 'text-earth-accent', bg: 'bg-[#FAF6F2]' },
                            spo2: { label: 'SpO2 Level', value: currentVitals?.spo2 || '--', unit: '%', icon: Wind, color: 'text-sage-primary', bg: 'bg-sage-light' },
                            stability: { label: 'Stability Index', value: selectedPatient.stabilityScore || '72', unit: '/100', icon: TrendingUp, color: selectedPatient.stabilityScore && selectedPatient.stabilityScore < 70 ? 'text-earth-accent' : 'text-sage-primary', bg: selectedPatient.stabilityScore && selectedPatient.stabilityScore < 70 ? 'bg-[#FAF6F2]' : 'bg-sage-light' },
                          };
                          const stat = statMap[vConfig.id];
                          return (
                            <motion.div 
                              layout
                              key={vConfig.id} 
                              className={`p-6 ${stat.bg} rounded-[32px] border border-natural-border/50 shadow-sm transition-transform hover:scale-[1.02]`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-sage-muted uppercase tracking-[0.1em]">{stat.label}</span>
                                <stat.icon size={14} className={stat.color} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-light ${stat.color}`}>{stat.value}</span>
                                <span className="text-[10px] font-bold text-sage-muted uppercase tracking-tighter">{stat.unit}</span>
                              </div>
                            </motion.div>
                          );
                      })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {layout.sections.filter(s => s.visible).map((section) => (
                      <motion.div 
                        key={section.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        {section.id === 'vitals-trends' && (
                          <div className="grid grid-cols-2 gap-8 shrink-0">
                            <div className="bg-white p-8 rounded-[40px] border border-natural-border shadow-sm">
                              <h3 className="text-[10px] font-bold text-sage-muted uppercase tracking-[0.2em] mb-8">Cardiovascular Stability</h3>
                              <VitalsChart 
                                data={vitalsHistory[selectedPatientId] || []} 
                                dataKey="heartRate" 
                                color="#5B6D5B" 
                                name="Heart Rate" 
                                unit="bpm" 
                              />
                            </div>
                            <div className="bg-white p-8 rounded-[40px] border border-natural-border shadow-sm">
                              <h3 className="text-[10px] font-bold text-sage-muted uppercase tracking-[0.2em] mb-8">Oxygen Trends (%)</h3>
                              <VitalsChart 
                                data={vitalsHistory[selectedPatientId] || []} 
                                dataKey="spo2" 
                                color="#8B735B" 
                                name="SpO2" 
                                unit="%" 
                              />
                            </div>
                          </div>
                        )}

                        {section.id === 'stability-markers' && (
                          <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-sm shrink-0">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-muted mb-8">Clinical Stability Markers</h3>
                            <div className="grid grid-cols-2 gap-12">
                              {/* ... content already exists ... */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Cardiovascular Stability</span>
                                  <span className={`text-xs font-serif italic ${selectedPatient.stabilityTrend === 'Declining' ? 'text-earth-accent' : 'text-green-700'}`}>
                                    {selectedPatient.stabilityTrend || 'Stable'}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-natural-bg rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${selectedPatient.stabilityScore || 70}%` }}
                                    className={`h-full rounded-full ${selectedPatient.stabilityScore && selectedPatient.stabilityScore < 70 ? 'bg-earth-accent' : 'bg-sage-primary'}`}
                                  />
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Metric Reliability</span>
                                  <span className="text-xs font-serif italic text-earth-accent">High Accuracy</span>
                                </div>
                                <div className="h-1.5 w-full bg-natural-bg rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '92%' }}
                                    className="h-full bg-earth-accent rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                            {selectedPatient.stabilityScore && selectedPatient.stabilityScore < 75 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-10 p-6 rounded-3xl bg-earth-accent/5 border border-earth-accent/20 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-earth-accent/10 flex items-center justify-center text-earth-accent">
                                    <Activity size={20} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-sage-primary">Stabilization Protocol Recommended</h4>
                                    <p className="text-[10px] text-sage-muted uppercase tracking-widest mt-1">Markers indicating moderate cardiovascular stress</p>
                                  </div>
                                </div>
                                <button className="px-6 py-3 bg-earth-accent text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-earth-accent/20 hover:opacity-90 transition-all">
                                  Enable Protocol
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {section.id === 'medication-table' && (
                          <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-sm shrink-0">
                            <div className="flex justify-between items-center mb-8">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-muted">Active Medication Protocols</h3>
                              <button className="text-[10px] font-bold text-earth-accent uppercase tracking-widest hover:underline">Full Rx History</button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-[9px] font-bold text-sage-muted uppercase tracking-widest border-b border-natural-border">
                                    <th className="pb-4">Agent</th>
                                    <th className="pb-4">Dosage</th>
                                    <th className="pb-4">Schedule</th>
                                    <th className="pb-4">Adherence</th>
                                    <th className="pb-4 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-natural-border">
                                  {selectedPatient.medications?.map((med, idx) => (
                                    <tr key={idx} className="group">
                                      <td className="py-5 font-serif font-bold text-sage-primary italic group-hover:text-black transition-colors">{med.name}</td>
                                      <td className="py-5 text-sm text-sage-muted">{med.dosage}</td>
                                      <td className="py-5 text-[10px] font-bold text-sage-muted uppercase tracking-tight">{med.frequency}</td>
                                      <td className="py-5">
                                        <div className="flex items-center gap-3">
                                          <div className="w-16 h-1 bg-natural-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-sage-primary rounded-full" style={{ width: `${med.adherence}%` }}></div>
                                          </div>
                                          <span className="text-[10px] font-bold text-sage-muted">{med.adherence}%</span>
                                        </div>
                                      </td>
                                      <td className="py-5 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${med.status === 'Active' ? 'bg-sage-light text-green-700' : 'bg-[#FAF6F2] text-earth-accent'}`}>
                                          {med.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {section.id === 'appointments' && (
                          <div className="bg-white p-10 rounded-[40px] border border-natural-border shadow-sm shrink-0">
                            <div className="flex justify-between items-center mb-8">
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-muted">Scheduled Protocols</h3>
                              <button className="text-[10px] font-bold text-sage-primary uppercase tracking-widest hover:underline">+ Book Specialist</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedPatient.appointments?.length > 0 ? (
                                selectedPatient.appointments.map((appt, i) => (
                                  <div key={i} className="p-6 rounded-[32px] bg-natural-bg border border-natural-border flex items-center justify-between group hover:border-sage-primary transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-2xl bg-white border border-natural-border flex items-center justify-center text-sage-primary shadow-sm group-hover:bg-sage-primary group-hover:text-white transition-colors">
                                        <Stethoscope size={24} />
                                      </div>
                                      <div>
                                        <h4 className="font-serif font-bold text-sage-primary italic text-lg leading-none">{appt.doctorName}</h4>
                                        <p className="text-[10px] text-sage-muted font-bold uppercase tracking-widest mt-2">{appt.type} • {appt.timestamp}</p>
                                      </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-sage-light text-green-700 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                                      {appt.status}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 p-12 rounded-[32px] border border-dashed border-natural-border flex flex-col items-center justify-center text-center">
                                  <Bell size={32} className="text-sage-muted mb-4 opacity-30" />
                                  <p className="text-sm font-serif italic text-sage-muted">No protocols scheduled for the next 48 hours.</p>
                                  <p className="text-[10px] font-bold text-sage-muted uppercase tracking-widest mt-2">MedGemma will initiate emergency dispatch if markers deteriorate.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {section.id === 'insight-panel' && (
                          <div className="bg-sage-primary text-natural-bg rounded-[48px] p-12 flex flex-col md:flex-row shrink-0 mb-12 shadow-2xl shadow-sage-primary/20 relative overflow-hidden border border-white/10">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-earth-accent/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

                            <div className="md:w-1/3 flex flex-col justify-between relative z-10">
                              <div>
                                <div className="flex items-center gap-4 mb-8">
                                  <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-[24px] flex items-center justify-center text-white ring-1 ring-white/30">
                                    <BrainCircuit size={32} />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-serif font-bold text-white italic leading-tight underline decoration-sage-muted decoration-2 underline-offset-8">MedGemma</h3>
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mt-2">Clinical Engine</p>
                                  </div>
                                </div>
                                <p className="text-base text-white/80 leading-relaxed font-medium">My diagnostics are processing chronic marker signatures from your wearable telemetry data.</p>
                              </div>
                              <button 
                                onClick={handleGetAiInsight}
                                disabled={isAiLoading || !currentVitals}
                                className="mt-12 w-full bg-white text-sage-primary hover:bg-natural-bg disabled:opacity-50 font-bold py-4 px-8 rounded-full transition-all flex items-center justify-center gap-3 shadow-xl transform active:scale-95"
                              >
                                {isAiLoading ? <Plus className="animate-spin" size={20} /> : <TrendingUp size={20} />}
                                Analyze Vitals
                              </button>

                              {isEmergencyActive && (
                                <motion.button 
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  onClick={() => setActiveVideoCall({ doctor: 'Dr. Sarah Jennings (On-Call)', patientId: selectedPatientId })}
                                  className="mt-4 w-full bg-error text-white font-bold py-4 px-8 rounded-full transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(196,43,28,0.4)] animate-pulse"
                                >
                                  <Video size={20} />
                                  Emergency Video Consult
                                </motion.button>
                              )}
                            </div>
                            <div className="flex-1 md:ml-12 mt-10 md:mt-0 relative z-10">
                              <div className="bg-white/5 backdrop-blur-md rounded-[32px] p-8 min-h-[300px] border border-white/10 shadow-inner">
                                <AnimatePresence mode="wait">
                                  {aiInsights[selectedPatientId] ? (
                                    <motion.div 
                                      key="insight"
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="text-white text-base leading-loose prose-invert"
                                    >
                                      <div className="w-10 h-10 bg-earth-accent rounded-full flex items-center justify-center font-serif text-xl italic mb-6 shadow-lg">g</div>
                                      <ReactMarkdown>{aiInsights[selectedPatientId]}</ReactMarkdown>
                                    </motion.div>
                                  ) : (
                                    <motion.div 
                                      key="placeholder"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 0.6 }}
                                      className="flex flex-col items-center justify-center text-center h-full pt-12"
                                    >
                                      <div className="p-8 rounded-full bg-white/5 border border-white/10 mb-6">
                                        <BrainCircuit size={48} className="text-white/60" />
                                      </div>
                                      <p className="text-white/40 text-lg font-serif italic max-w-sm">Tap the engine to generate personalized diagnostic context from live streams.</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full p-10 flex flex-col overflow-hidden"
              >
                <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col gap-8">
                  <div className="flex items-center justify-between shrink-0">
                    <div>
                      <h2 className="text-4xl font-serif font-bold text-sage-primary italic tracking-tight">Consultant Lounge</h2>
                      <p className="text-[11px] font-bold text-sage-muted uppercase tracking-[0.3em] mt-3">Direct Collaboration with MedGemma v2.4</p>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 bg-white text-sage-primary rounded-full border border-natural-border shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Link</span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 flex gap-8">
                    <div className="flex-1 bg-white rounded-[48px] border border-natural-border shadow-sm p-4 overflow-hidden">
                      <MedGemmaChat />
                    </div>
                    
                    {/* Video Call History Sidebar */}
                    <div className="w-80 shrink-0 flex flex-col gap-6">
                      <div className="bg-white rounded-[40px] border border-natural-border shadow-sm p-8 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="p-2 bg-sage-light rounded-xl text-sage-primary">
                            <Video size={16} />
                          </div>
                          <h3 className="text-[10px] font-bold text-sage-muted uppercase tracking-[0.2em]">Consult Logs</h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                          {selectedPatient.videoCalls?.length > 0 ? (
                            selectedPatient.videoCalls.map((call, i) => (
                              <div key={i} className="p-5 rounded-3xl bg-natural-bg border border-natural-border hover:border-sage-primary transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-serif font-bold text-sage-primary italic text-base leading-none group-hover:text-black">{call.doctorName}</h4>
                                  <span className="text-[9px] font-bold text-sage-muted uppercase tracking-tighter bg-white px-2 py-0.5 rounded-full border border-natural-border shadow-sm">{call.duration}</span>
                                </div>
                                <p className="text-[10px] text-sage-muted font-medium uppercase tracking-widest">{call.timestamp}</p>
                                <div className="mt-4 flex items-center gap-2 text-sage-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[9px] font-bold uppercase tracking-widest">Replay Transcript</span>
                                  <ChevronRight size={10} />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                              <div className="w-16 h-16 rounded-full border-2 border-dashed border-sage-muted flex items-center justify-center mb-4">
                                <Video size={24} className="text-sage-muted" />
                              </div>
                              <p className="text-xs font-serif italic text-sage-muted">No secure call logs found.</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-natural-border">
                          <button className="w-full py-4 bg-sage-primary/5 border border-sage-primary/20 rounded-full text-sage-primary text-[9px] font-bold uppercase tracking-widest hover:bg-sage-primary/10 transition-all flex items-center justify-center gap-2">
                             Secure Audit Log (PDF)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <footer className="h-12 flex justify-between items-center px-10 text-[9px] text-sage-muted uppercase tracking-[0.25em] bg-white/50 border-t border-natural-border shrink-0">
          <div className="flex items-center gap-4">
            <div>WATCH SYNC: {lastSyncTime.toLocaleTimeString()} EST</div>
            <div className={`flex items-center gap-2 ${isConnected ? 'text-sage-primary' : 'text-error'}`}>
              <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-sage-primary animate-pulse' : 'bg-error'}`}></div>
              {isConnected ? 'LIVE FEED ACTIVE' : 'TELEMETRY OFFLINE'}
            </div>
          </div>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-sage-muted rounded-full"></div> Privacy Secure</span>
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-sage-muted rounded-full"></div> HIPAA Cloud</span>
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-sage-muted rounded-full"></div> MedGemma Core</span>
          </div>
        </footer>
      </main>

      {/* Layout Settings Modal */}
      <AnimatePresence>
        {showLayoutSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLayoutSettings(false)}
              className="absolute inset-0 bg-sage-primary/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] p-12 w-full max-w-2xl shadow-2xl border border-natural-border overflow-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-sage-primary italic mb-2">Display Architecture</h2>
                  <p className="text-[10px] text-sage-muted font-bold uppercase tracking-widest">Personalize your clinical workspace signature</p>
                </div>
                <button 
                  onClick={() => setShowLayoutSettings(false)}
                  className="w-10 h-10 rounded-full bg-natural-bg flex items-center justify-center text-sage-muted hover:text-sage-primary transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-12">
                {/* Vital Widgets Column */}
                <div>
                  <h3 className="text-[11px] font-bold text-sage-muted uppercase tracking-[0.2em] mb-6 border-b border-natural-border pb-2">Vital Stream Widgets</h3>
                  <div className="space-y-3">
                    {layout.vitals.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-3 p-4 bg-natural-bg rounded-2xl border border-natural-border group">
                        <div className="flex flex-col gap-1">
                          <button 
                            disabled={i === 0}
                            onClick={() => moveItem('vitals', v.id, 'up')}
                            className="text-sage-muted hover:text-sage-primary disabled:opacity-20"
                          >
                            <ChevronRight className="-rotate-90" size={12} />
                          </button>
                          <button 
                            disabled={i === layout.vitals.length - 1}
                            onClick={() => moveItem('vitals', v.id, 'down')}
                            className="text-sage-muted hover:text-sage-primary disabled:opacity-20"
                          >
                            <ChevronRight className="rotate-90" size={12} />
                          </button>
                        </div>
                        <span className="flex-1 text-xs font-bold text-sage-primary uppercase tracking-tight">{v.label}</span>
                        <button 
                          onClick={() => toggleVital(v.id)}
                          className={`p-2 rounded-xl transition-all ${v.visible ? 'bg-sage-primary text-white shadow-md' : 'bg-white text-sage-muted border border-natural-border'}`}
                        >
                          {v.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dashboard Sections Column */}
                <div>
                  <h3 className="text-[11px] font-bold text-sage-muted uppercase tracking-[0.2em] mb-6 border-b border-natural-border pb-2">Main Sections</h3>
                  <div className="space-y-3">
                    {layout.sections.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 p-4 bg-natural-bg rounded-2xl border border-natural-border group">
                        <div className="flex flex-col gap-1">
                          <button 
                            disabled={i === 0}
                            onClick={() => moveItem('sections', s.id, 'up')}
                            className="text-sage-muted hover:text-sage-primary disabled:opacity-20"
                          >
                            <ChevronRight className="-rotate-90" size={12} />
                          </button>
                          <button 
                            disabled={i === layout.sections.length - 1}
                            onClick={() => moveItem('sections', s.id, 'down')}
                            className="text-sage-muted hover:text-sage-primary disabled:opacity-20"
                          >
                            <ChevronRight className="rotate-90" size={12} />
                          </button>
                        </div>
                        <span className="flex-1 text-xs font-bold text-sage-primary uppercase tracking-tight">{s.label}</span>
                        <button 
                          onClick={() => toggleSection(s.id)}
                          className={`p-2 rounded-xl transition-all ${s.visible ? 'bg-sage-primary text-white shadow-md' : 'bg-white text-sage-muted border border-natural-border'}`}
                        >
                          {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end gap-4">
                <button 
                  onClick={() => setLayout({
                    vitals: [
                      { id: 'hr', label: 'Heart Rate', visible: true, order: 0 },
                      { id: 'bp', label: 'Blood Pressure', visible: true, order: 1 },
                      { id: 'spo2', label: 'SpO2 Level', visible: true, order: 2 },
                      { id: 'stability', label: 'Stability Index', visible: true, order: 3 },
                    ],
                    sections: [
                      { id: 'vitals-trends', label: 'Vitals Trends', visible: true, order: 0 },
                      { id: 'stability-markers', label: 'Stability Markers', visible: true, order: 1 },
                      { id: 'medication-table', label: 'Medication Table', visible: true, order: 2 },
                      { id: 'appointments', label: 'Upcoming Protocols', visible: true, order: 3 },
                      { id: 'insight-panel', label: 'AI Insight Panel', visible: true, order: 4 },
                    ]
                  })}
                  className="px-8 py-4 text-[10px] font-bold text-sage-muted uppercase tracking-widest hover:text-sage-primary transition-colors"
                >
                  Reset Defaults
                </button>
                <button 
                  onClick={() => setShowLayoutSettings(false)}
                  className="px-10 py-4 bg-sage-primary text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-sage-primary/20 hover:opacity-90 transition-all"
                >
                  Save Signature
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showAddPatientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPatientModal(false)}
              className="absolute inset-0 bg-sage-primary/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] p-12 w-full max-w-lg shadow-2xl border border-natural-border"
            >
              <h2 className="text-3xl font-serif font-bold text-sage-primary italic mb-2">New Resident Profile</h2>
              <p className="text-[10px] text-sage-muted font-bold uppercase tracking-widest mb-8">Initialize baseline clinical metadata</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-sage-muted uppercase tracking-widest mb-2">Full Legal Name</label>
                  <input 
                    type="text" 
                    value={newPatient.name}
                    onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                    placeholder="e.g. Johnathan Doe" 
                    className="w-full bg-natural-bg border border-natural-border rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-sage-primary/20 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-sage-muted uppercase tracking-widest mb-2">Age</label>
                    <input 
                      type="number" 
                      value={newPatient.age}
                      onChange={e => setNewPatient({...newPatient, age: e.target.value})}
                      placeholder="65" 
                      className="w-full bg-natural-bg border border-natural-border rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-sage-primary/20 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-sage-muted uppercase tracking-widest mb-2">Room / Ward</label>
                    <input 
                      type="text" 
                      value={newPatient.room}
                      onChange={e => setNewPatient({...newPatient, room: e.target.value})}
                      placeholder="ICU-12" 
                      className="w-full bg-natural-bg border border-natural-border rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-sage-primary/20 transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sage-muted uppercase tracking-widest mb-2">Primary Diagnosis</label>
                  <input 
                    type="text" 
                    value={newPatient.condition}
                    onChange={e => setNewPatient({...newPatient, condition: e.target.value})}
                    placeholder="Diabetes Type II" 
                    className="w-full bg-natural-bg border border-natural-border rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-sage-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-12">
                <button 
                  onClick={() => setShowAddPatientModal(false)}
                  className="flex-1 py-4 px-8 rounded-full border border-natural-border text-[10px] font-bold uppercase tracking-widest hover:bg-natural-bg transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const id = `MC-${Math.floor(1000 + Math.random() * 9000)}`;
                    const p: Patient = {
                      id,
                      name: newPatient.name || 'Unknown Patient',
                      age: parseInt(newPatient.age) || 0,
                      sex: 'M',
                      condition: newPatient.condition || 'General Observation',
                      room: newPatient.room || 'TBD',
                      history: [],
                      medications: [],
                      appointments: [],
                      videoCalls: []
                    };
                    setPatients([...patients, p]);
                    setSelectedPatientId(id);
                    setShowAddPatientModal(false);
                    setNewPatient({ name: '', condition: '', room: '', age: '' });
                  }}
                  className="flex-1 py-4 px-8 rounded-full bg-sage-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-sage-primary/20 hover:opacity-90 transition-all"
                >
                  Confirm Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Overlay */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-sage-primary/10 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl border-l border-natural-border p-12 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-serif font-bold text-sage-primary italic tracking-tight">Clinical Log</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-natural-bg rounded-full transition-colors"><ChevronRight size={24} className="text-sage-muted" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                {[
                  { date: 'Oct 12, 2024', event: 'Medication Adjustment', desc: 'Increased Lisinopril dosage to 15mg following persistent hypertensive response.' },
                  { date: 'Oct 05, 2024', event: 'Vitals Alert', desc: 'Tachycardia episode (112 BPM) detected during nocturnal sleep cycle.' },
                  { date: 'Sep 28, 2024', event: 'Clinical Consult', desc: 'MedGemma indicated 82% correlation with early-stage renal stress markers.' },
                  { date: 'Sep 15, 2024', event: 'Routine Check-in', desc: 'Patient reports improved breathability and increased mobility in ward cycles.' },
                ].map((item, i) => (
                  <div key={i} className="relative pl-8 group">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-sage-primary ring-4 ring-sage-light transition-all group-hover:scale-125 shadow-sm"></div>
                    <div className="absolute left-[3px] top-4 w-px h-full bg-natural-border"></div>
                    <p className="text-[10px] font-bold text-sage-muted uppercase tracking-widest mb-2">{item.date}</p>
                    <h4 className="text-lg font-serif font-bold text-sage-primary italic mb-2">{item.event}</h4>
                    <p className="text-sm text-sage-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <button className="w-full mt-12 py-5 bg-natural-bg border border-natural-border rounded-full text-[10px] font-bold text-sage-muted uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-natural-border transition-colors">
                <Activity size={16} /> Export Full Record (HL7)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-sage-primary/5 shadow-inner"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[40px] p-12 w-full max-w-md shadow-2xl border border-natural-border"
            >
              <h2 className="text-3xl font-serif font-bold text-sage-primary italic mb-10">Hub Preferences</h2>
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-sage-primary">High Contrast Mode</h4>
                    <p className="text-[10px] text-sage-muted uppercase mt-1">Accessibility Optimization</p>
                  </div>
                  <div className="w-12 h-6 bg-natural-bg rounded-full p-1 border border-natural-border cursor-pointer">
                    <div className="w-4 h-4 bg-sage-muted rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-sage-primary">Telemetry Sync</h4>
                    <p className="text-[10px] text-sage-muted uppercase mt-1">Real-time Wearable Stream</p>
                  </div>
                  <div 
                    onClick={() => setIsConnected(!isConnected)}
                    className={`w-12 h-6 rounded-full p-1 border cursor-pointer flex transition-all ${isConnected ? 'bg-sage-light border-sage-primary/20 justify-end' : 'bg-natural-bg border-natural-border justify-start'}`}
                  >
                    <div className={`w-4 h-4 rounded-full shadow-sm transition-colors ${isConnected ? 'bg-sage-primary' : 'bg-sage-muted'}`}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-sage-primary">AI Diagnostic Level</h4>
                    <p className="text-[10px] text-sage-muted uppercase mt-1">Gemma-3 Spec: Comprehensive</p>
                  </div>
                  <span className="text-[10px] font-bold text-sage-primary uppercase tracking-widest border-b border-sage-primary pb-0.5">Edit</span>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-12 py-4 rounded-full bg-sage-primary text-white text-[10px] font-bold uppercase tracking-widest"
              >
                Save Protocol
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Video Consult UI */}
      <AnimatePresence>
        {activeVideoCall && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full h-full max-w-6xl aspect-video rounded-[48px] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col"
            >
              {/* Remote Stream (Doctor) */}
              <div className="absolute inset-0 bg-gradient-to-br from-sage-primary/20 to-black flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-sage-primary/30 flex items-center justify-center mb-6 ring-4 ring-sage-primary/50 animate-pulse mx-auto">
                    <Users size={64} className="text-white/20" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white italic">{activeVideoCall.doctor}</h3>
                  <p className="text-xs text-white/40 uppercase tracking-[0.2em] mt-3">Connecting to Secure Medical Channel...</p>
                </div>
              </div>

              {/* Local Stream (Preview) */}
              <div className="absolute top-10 right-10 w-64 aspect-video bg-white/10 backdrop-blur-3xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl z-20">
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={32} className="text-white/20" />
                </div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Self View</span>
                </div>
              </div>

              {/* Patient Vitals Overlay */}
              <div className="absolute bottom-32 left-10 p-8 bg-black/40 backdrop-blur-xl rounded-[32px] border border-white/10 z-20 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-error animate-ping"></div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Live Metadata Stream</h4>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Heart Rate</p>
                    <p className="text-2xl font-serif font-bold text-white italic">{currentVitals?.heartRate ?? '--'} <span className="text-xs italic opacity-50">BPM</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">SpO2</p>
                    <p className="text-2xl font-serif font-bold text-white italic">{currentVitals?.spo2 ?? '--'} <span className="text-xs italic opacity-50">%</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Pressure</p>
                    <p className="text-2xl font-serif font-bold text-white italic">{currentVitals?.bloodPressure.split('/')[0] ?? '--'} <span className="text-xs italic opacity-50">SYS</span></p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-10 inset-x-0 flex justify-center items-center gap-6 z-20">
                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <Mic size={24} />
                </button>
                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <VideoOff size={24} />
                </button>
                <button 
                  onClick={() => {
                    const durationInSeconds = Math.floor(Math.random() * 600) + 300; // Mock duration
                    const minutes = Math.floor(durationInSeconds / 60);
                    const seconds = durationInSeconds % 60;
                    const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                    
                    const newCall: VideoCallRecord = {
                      id: `vc-${Date.now()}`,
                      doctorName: activeVideoCall.doctor,
                      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' •'),
                      duration: durationStr
                    };

                    setPatients(prev => prev.map(p => 
                      p.id === selectedPatientId 
                        ? { ...p, videoCalls: [newCall, ...(p.videoCalls || [])] }
                        : p
                    ));
                    
                    setActiveVideoCall(null);
                  }}
                  className="w-20 h-20 rounded-full bg-error flex items-center justify-center text-white shadow-2xl shadow-error/40 hover:scale-105 active:scale-95 transition-all"
                >
                  <PhoneOff size={32} />
                </button>
                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <Settings size={24} />
                </button>
                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                  <MessageSquare size={24} />
                </button>
              </div>

              {/* Status Header */}
              <div className="absolute top-10 left-10 flex items-center gap-4 z-20">
                <div className="px-6 py-3 bg-error text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg shadow-error/20 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  Emergency Line Active
                </div>
                <div className="px-6 py-3 bg-white/10 backdrop-blur-xl text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-white/20">
                  {selectedPatient.name.toUpperCase()} • {selectedPatient.id}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
