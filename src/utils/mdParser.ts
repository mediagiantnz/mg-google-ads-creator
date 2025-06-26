import { Campaign, CampaignStatus } from '../types';

interface ParsedCampaign {
  name: string;
  tier: 1 | 2 | 3;
  dailyBudget: number;
}

export function parseMDFile(content: string): Campaign[] {
  const campaigns: Campaign[] = [];
  const lines = content.split('\n');
  
  let currentTier: 1 | 2 | 3 | null = null;
  let campaignId = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and headers
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Check for tier indicators
    if (trimmedLine.match(/^(Tier\s*1|T1)/i)) {
      currentTier = 1;
      continue;
    } else if (trimmedLine.match(/^(Tier\s*2|T2)/i)) {
      currentTier = 2;
      continue;
    } else if (trimmedLine.match(/^(Tier\s*3|T3)/i)) {
      currentTier = 3;
      continue;
    }
    
    // Parse campaign lines
    // Expected formats:
    // - Campaign Name - $XX.XX
    // - Campaign Name: $XX.XX
    // - Campaign Name | $XX.XX
    const campaignMatch = trimmedLine.match(/^(.+?)[\-\:|]\s*\$?([\d,]+\.?\d*)/);
    
    if (campaignMatch && currentTier) {
      const name = campaignMatch[1].trim();
      const budgetStr = campaignMatch[2].replace(/,/g, '');
      const dailyBudget = parseFloat(budgetStr);
      
      if (!isNaN(dailyBudget) && dailyBudget > 0) {
        campaigns.push({
          id: `campaign-${++campaignId}`,
          name: `T${currentTier}-${name}`,
          tier: currentTier,
          dailyBudget: dailyBudget,
          monthlyBudget: dailyBudget * 30, // Approximate monthly budget
          status: CampaignStatus.PENDING,
        });
      }
    }
  }
  
  return campaigns;
}

export function calculateTotalBudgets(campaigns: Campaign[]) {
  const totalDaily = campaigns.reduce((sum, campaign) => sum + campaign.dailyBudget, 0);
  const totalMonthly = campaigns.reduce((sum, campaign) => sum + campaign.monthlyBudget, 0);
  
  return {
    totalDaily: parseFloat(totalDaily.toFixed(2)),
    totalMonthly: parseFloat(totalMonthly.toFixed(2)),
    campaignCount: campaigns.length,
  };
}

export function groupCampaignsByTier(campaigns: Campaign[]) {
  const grouped: Record<number, Campaign[]> = {
    1: [],
    2: [],
    3: [],
  };
  
  campaigns.forEach(campaign => {
    grouped[campaign.tier].push(campaign);
  });
  
  return grouped;
}

export function validateMDContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'File is empty' };
  }
  
  const campaigns = parseMDFile(content);
  
  if (campaigns.length === 0) {
    return { valid: false, error: 'No valid campaigns found in the file' };
  }
  
  // Check for duplicate campaign names
  const names = campaigns.map(c => c.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    return { valid: false, error: 'Duplicate campaign names found' };
  }
  
  return { valid: true };
}