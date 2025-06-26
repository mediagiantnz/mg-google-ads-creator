import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../components/Card';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { Campaign, CampaignStatus, CampaignJob } from '../types';
import api from '../services/api';
import { isApiSuccessResponse } from '../types';

export const ProgressScreen: React.FC = () => {
  const navigate = useNavigate();
  const [job, setJob] = useState<CampaignJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('jobData');
    if (!storedData) {
      navigate('/');
      return;
    }

    try {
      const data = JSON.parse(storedData);
      // Start polling for job status
      startPolling(data.jobId);
    } catch (err) {
      setError('Failed to load job data');
      setTimeout(() => navigate('/'), 3000);
    }

    // Cleanup
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    // Initial fetch
    fetchJobStatus(jobId);

    // Set up polling every 5 seconds
    const interval = setInterval(() => {
      fetchJobStatus(jobId);
    }, 5000);

    setPollingInterval(interval);
  };

  const fetchJobStatus = async (jobId: string) => {
    try {
      const response = await api.getStatus(jobId);
      
      if (isApiSuccessResponse(response)) {
        setJob(response.data.job);
        
        // Stop polling if job is complete or failed
        if (response.data.job.status === 'completed' || response.data.job.status === 'failed') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } else {
        setError(response.error.message);
      }
    } catch (err) {
      setError('Failed to fetch job status');
    }
  };

  const getProgressPercentage = () => {
    if (!job) return 0;
    
    const total = job.campaigns.length;
    const completed = job.campaigns.filter(
      c => c.status === CampaignStatus.COMPLETED || c.status === CampaignStatus.FAILED
    ).length;
    
    return Math.round((completed / total) * 100);
  };

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.COMPLETED:
        return '✓';
      case CampaignStatus.FAILED:
        return '✗';
      case CampaignStatus.CREATING:
        return '⟳';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.COMPLETED:
        return 'text-green-600';
      case CampaignStatus.FAILED:
        return 'text-red-600';
      case CampaignStatus.CREATING:
        return 'text-yellow-600';
      default:
        return 'text-gray-400';
    }
  };

  const handleDownloadReport = () => {
    if (!job) return;
    
    const report = {
      jobId: job.jobId,
      accountId: job.accountId,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      campaigns: job.campaigns,
      summary: {
        total: job.campaigns.length,
        completed: job.campaigns.filter(c => c.status === CampaignStatus.COMPLETED).length,
        failed: job.campaigns.filter(c => c.status === CampaignStatus.FAILED).length,
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-report-${job.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewJob = () => {
    sessionStorage.removeItem('jobData');
    navigate('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Alert type="error" message={error} />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" label="Loading job status..." />
      </div>
    );
  }

  const progress = getProgressPercentage();
  const completedCount = job.campaigns.filter(c => c.status === CampaignStatus.COMPLETED).length;
  const failedCount = job.campaigns.filter(c => c.status === CampaignStatus.FAILED).length;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Creating Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress: {progress}%</span>
                <span>{completedCount + failedCount} of {job.campaigns.length} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {job.campaigns.filter(c => c.status === CampaignStatus.CREATING).length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>

            {/* Campaign List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {job.campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      {campaign.status === CampaignStatus.CREATING && (
                        <p className="text-sm text-gray-500">Creating...</p>
                      )}
                      {campaign.error && (
                        <p className="text-sm text-red-600">{campaign.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">${campaign.dailyBudget}/day</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {job.status === 'completed' || job.status === 'failed' ? (
              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={handleNewJob}>
                  Create New Campaigns
                </Button>
                <Button onClick={handleDownloadReport}>
                  Download Report
                </Button>
              </div>
            ) : (
              <div className="text-center pt-4">
                <Spinner size="md" label="Creating campaigns..." />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};