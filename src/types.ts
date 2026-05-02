export interface VitalSigns {
  patientId: string;
  heartRate: number;
  bloodPressure: string;
  spo2: number;
  timestamp: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  adherence: number;
  status: 'Active' | 'Monitor' | 'Discontinued';
}

export interface Appointment {
  id: string;
  doctorName: string;
  type: 'Routine' | 'Emergency Video';
  status: 'Scheduled' | 'In Progress' | 'Completed';
  timestamp: string;
}

export interface VideoCallRecord {
  id: string;
  doctorName: string;
  timestamp: string;
  duration: string;
}

export interface Patient {
  id: string;
  name: string;
  condition: string;
  age: number;
  sex: 'M' | 'F';
  room: string;
  history: string[];
  medications: Medication[];
  appointments: Appointment[];
  videoCalls: VideoCallRecord[];
  stabilityScore?: number;
  stabilityTrend?: 'Stable' | 'Improving' | 'Declining';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
