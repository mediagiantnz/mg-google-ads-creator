// Campaign status enum
export enum CampaignStatus {
  PENDING = 'pending',
  CREATING = 'creating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Individual campaign interface
export interface Campaign {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  dailyBudget: number;
  monthlyBudget: number;
  status: CampaignStatus;
  error?: string;
}

// Campaign job interface
export interface CampaignJob {
  jobId: string;
  accountId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  campaigns: Campaign[];
  createdAt: string;
  completedAt?: string;
}

// API response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Specific API response types
export interface CreateCampaignRequest {
  mdContent: string;
  accountId: string;
}

export interface CreateCampaignResponse {
  jobId: string;
  message: string;
}

export interface GetJobStatusResponse {
  job: CampaignJob;
}

// Helper type guards
export function isApiSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}