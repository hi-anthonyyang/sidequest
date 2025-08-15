export interface Question {
  id: number;
  text: string;
  placeholder?: string;
}

export interface AssessmentResponse {
  questionId: number;
  answer: string;
}

export interface Major {
  name: string;
  description: string;
  department: string;
  requirements?: string[];
}

export interface Organization {
  name: string;
  description: string;
  category: string;
  website?: string;
}

export interface Event {
  id?: string;
  name: string;
  description: string;
  date: string;
  location: string;
  category: string;
}

export interface CareerPath {
  title: string;
  description: string;
  relatedMajors: string[];
  salary?: {
    min: number;
    max: number;
  };
  growthOutlook?: string;
  educationLevel?: string;
}

export interface AssessmentResults {
  majors: Major[];
  careers: CareerPath[];
  organizations: Organization[];
  events: Event[];
  archetype?: string;
}

// New types for multi-university support
export interface University {
  id: string;
  name: string;
  shortName: string;
  description: string;
  website: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

export interface UniversityData {
  university: University;
  majors: Major[];
  organizations: Organization[];
  events: Event[];
}

export type UniversityId = 'fresno_state' | 'reedley_college' | 'fresno_city_college'; 