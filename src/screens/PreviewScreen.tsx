import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card, { CardContent, CardHeader, CardTitle, CardFooter } from '../components/Card';
import Alert from '../components/Alert';
import { Campaign } from '../types';
import { calculateTotalBudgets, groupCampaignsByTier } from '../utils/mdParser';

export const PreviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobId, setJobId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('jobData');
    if (!storedData) {
      navigate('/');
      return;
    }

    try {
      const data = JSON.parse(storedData);
      setCampaigns(data.campaigns);
      setJobId(data.jobId);
      setAccountId(data.accountId);
    } catch (err) {
      setError('Failed to load campaign data');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [navigate]);

  const budgetSummary = calculateTotalBudgets(campaigns);
  const campaignsByTier = groupCampaignsByTier(campaigns);

  const handleCreateCampaigns = () => {
    // Navigate to progress screen
    navigate('/progress');
  };

  const handleBack = () => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Campaign Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total Campaigns</p>
                <p className="text-2xl font-bold text-blue-900">{budgetSummary.campaignCount}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Daily Budget</p>
                <p className="text-2xl font-bold text-green-900">${budgetSummary.totalDaily}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Monthly Budget</p>
                <p className="text-2xl font-bold text-purple-900">${budgetSummary.totalMonthly}</p>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Account ID:</span> {accountId}
              </p>
            </div>

            {[1, 2, 3, 4].map((tier) => {
              const tierCampaigns = campaignsByTier[tier];
              if (tierCampaigns.length === 0) return null;

              return (
                <div key={tier} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    Tier {tier} Campaigns ({tierCampaigns.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Campaign Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Daily Budget
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monthly Budget
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tierCampaigns.map((campaign) => (
                          <tr key={campaign.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {campaign.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${campaign.dailyBudget.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${campaign.monthlyBudget.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {campaign.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={handleBack}>
              ← Back
            </Button>
            <Button onClick={handleCreateCampaigns}>
              Create All Campaigns
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};