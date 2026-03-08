// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id:        string
  fullName:  string
  email:     string
  crp:       string
  specialty: string
}

export interface AuthState {
  user:        User | null
  accessToken: string | null
  isLoading:   boolean
  login:  (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

// ── Patient ───────────────────────────────────────────────────────────────────
export interface PatientSummary {
  id:           string
  fullName:     string
  cpf:          string
  phone:        string
  email?:       string
  dateOfBirth?: string
  isActive:     boolean
  createdAt:    string
  sessionCount: number
}

export interface PatientDetail extends PatientSummary {
  gender:           string
  maritalStatus:    string
  address?:         string
  emergencyContact?: string
  chiefComplaint:   string
  internalNotes?:   string
  inactivatedAt?:   string
  sessions:         SessionSummary[]
  medications:      Medication[]
  documents:        PatientDocument[]
}

export interface DashboardSession {
  id:            string
  patientId:     string
  patientName:   string
  sessionDate:   string
  sessionTime?:  string
  sessionNumber: number
  durationMin:   number
  mood?:         PatientMood
}

export interface CreatePatientPayload {
  fullName:         string
  cpf?:             string
  phone:            string
  email?:           string
  dateOfBirth?:     string
  gender?:          string
  maritalStatus?:   string
  address?:         string
  emergencyContact?: string
  chiefComplaint:   string
  internalNotes?:   string
}

// ── Session ───────────────────────────────────────────────────────────────────
export type PatientMood = 1 | 2 | 3 | 4 | 5
export const MOOD_LABELS: Record<PatientMood, string> = {
  1: 'Muito ansioso(a)',
  2: 'Ansioso(a)',
  3: 'Neutro(a)',
  4: 'Bem',
  5: 'Muito bem',
}

export interface SessionSummary {
  id:            string
  sessionDate:   string
  sessionNumber: number
  durationMin:   number
  mood?:         PatientMood
  createdAt:     string
}

export interface SessionDetail extends SessionSummary {
  patientId:   string
  sessionTime?: string
  notes:       string
  plan?:       string
  updatedAt:   string
  documents:   SessionDocument[]
}

export interface CreateSessionPayload {
  patientId:   string
  sessionDate: string
  sessionTime?: string
  durationMin: number
  notes:       string
  plan?:       string
  mood?:       PatientMood
}

// ── Medication ────────────────────────────────────────────────────────────────
export interface Medication {
  id:         string
  name:       string
  dosage?:    string
  frequency?: string
  prescriber?: string
  notes?:     string
  isActive:   boolean
  startDate?: string
  endDate?:   string
}

// ── Documents ─────────────────────────────────────────────────────────────────
export interface PatientDocument {
  id:           string
  fileName:     string
  contentType:  string
  fileSizeBytes: number
  description?: string
  uploadedAt:   string
}

export interface SessionDocument {
  id:           string
  fileName:     string
  contentType:  string
  fileSizeBytes: number
  uploadedAt:   string
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items:      T[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}
