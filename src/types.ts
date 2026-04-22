export interface ApplicationRecord {
  name: string;
  email: string;
  country: string;
  why_mlh: string; // "Why do you want to be an MLH Fellow?"
  perspective: string; // "What perspective or experience?"
  school: string;
  major: string;
  experience: string;
  project_demo_url: string;
  project_code_url: string;
  social_good_focus?: string;
  teamwork_evidence?: string;
  extra_info?: string;
  [key: string]: any;
}

export interface ScreeningResult {
  rank: number;
  name: string;
  email: string;
  country: string;
  app_score: number;
  code_score: number;
  code_quality: string;
  final_score: number;
  code_description: string;
  social_good: "Y" | "N";
  teamwork_evidence: "Y" | "N";
  code_url: string;
  disqualified: boolean;
  disqualification_reason?: string;
}

export interface BatchSummary {
  total: number;
  disqualified: number;
  social_good_standouts: number;
  collaborative_priority: number;
  average_score: number;
}
