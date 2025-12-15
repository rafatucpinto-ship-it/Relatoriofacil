export interface ReportPhoto {
  id: string;
  base64: string;
  caption?: string;
  edited?: boolean; // If true, it has drawings on it
}

export interface ReportTemplate {
  id: string;
  title: string;
  omDescription: string;
  activityExecuted: string;
  createdAt: number;
}

export interface ReportData {
  id: string;
  templateId: string;
  date: string;
  equipment: string;
  omNumber: string;
  activityType: 'Preventiva' | 'Corretiva';
  activityExecuted?: string; // Field to store specific activity text (editable if Corretiva)
  startTime: string;
  endTime: string;
  iamoDeviation: boolean;
  iamoDeviationDetails: string;
  omFinished: boolean;
  pendings: boolean;
  pendingDetails?: string; // Details about the pending items
  team: string;
  workCenter: string;
  technicians: string;
  photos: ReportPhoto[]; // Changed from string[] to object array
  status?: 'draft' | 'completed';
  createdAt: number;
  updatedAt?: number;
}

export interface User {
  username: string;
  password: string; // Stored locally for offline use
  createdAt: number;
}

export const TEAMS = ['A', 'B', 'C', 'D'];
export const WORK_CENTERS = ['SC108HH', 'SC118HH', 'SC103HH', 'SC105HH', 'SC117HH'];