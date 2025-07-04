import axios, { AxiosInstance } from 'axios';
import { 
  CreateCampaignRequest, 
  CreateCampaignResponse, 
  GetJobStatusResponse,
  ApiResponse 
} from '../types';

class CampaignAPI {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.REACT_APP_API_URL || 'https://api.gateway.url/prod';
    
    // Check if API URL is configured
    if (baseURL === 'https://api.gateway.url/prod') {
      console.warn('⚠️ API URL not configured. Please set REACT_APP_API_URL in your .env file');
    }
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async parseFile(mdContent: string, accountId: string): Promise<ApiResponse<CreateCampaignResponse>> {
    try {
      const response = await this.client.post<CreateCampaignResponse>('/parse', {
        mdContent,
        accountId,
      } as CreateCampaignRequest);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      // Check for network errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_NAME_NOT_RESOLVED') {
        return {
          success: false,
          error: {
            message: 'Cannot connect to server. Please ensure the backend is deployed and API URL is configured.',
            details: 'Check your .env file for REACT_APP_API_URL configuration',
          },
        };
      }
      
      return {
        success: false,
        error: {
          message: error.response?.data?.message || 'Failed to parse file',
          details: error.response?.data?.details,
        },
      };
    }
  }

  async getStatus(jobId: string): Promise<ApiResponse<GetJobStatusResponse>> {
    try {
      const response = await this.client.get<GetJobStatusResponse>(`/status/${jobId}`);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      // Check for network errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_NAME_NOT_RESOLVED') {
        return {
          success: false,
          error: {
            message: 'Cannot connect to server. Please ensure the backend is deployed and API URL is configured.',
            details: 'Check your .env file for REACT_APP_API_URL configuration',
          },
        };
      }
      
      return {
        success: false,
        error: {
          message: error.response?.data?.message || 'Failed to fetch job status',
          details: error.response?.data?.details,
        },
      };
    }
  }
}

export default new CampaignAPI();