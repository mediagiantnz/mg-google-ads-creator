import { Campaign, CampaignStatus } from '../types';

interface ParsedCampaign {
  name: string;
  tier: 1 | 2 | 3 | 4;
  dailyBudget: number;
}

export function parseMDFile(content: string): Campaign[] {
  const campaigns: Campaign[] = [];
  const lines = content.split('\n');
  
  let currentTier: 1 | 2 | 3 | 4 | null = null;
  let campaignId = 0;
  let inCampaignSection = false;
  let currentCampaignName: string | null = null;
  const processedCampaigns = new Set<string>(); // Track processed campaign names to avoid duplicates
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }
    
    // Check for tier headers in various formats
    // ### **TIER 1 CAMPAIGNS (5 campaigns - $1,400/month)**
    // ### TIER 1 CAMPAIGNS
    // ## TIER 1
    if (trimmedLine.match(/TIER\s*1\s*CAMPAIGNS?/i) || trimmedLine.match(/^###?\s*\*?\*?TIER\s*1/i)) {
      currentTier = 1;
      inCampaignSection = true;
      continue;
    } else if (trimmedLine.match(/TIER\s*2\s*CAMPAIGNS?/i) || trimmedLine.match(/^###?\s*\*?\*?TIER\s*2/i)) {
      currentTier = 2;
      inCampaignSection = true;
      continue;
    } else if (trimmedLine.match(/TIER\s*3\s*CAMPAIGNS?/i) || trimmedLine.match(/^###?\s*\*?\*?TIER\s*3/i)) {
      currentTier = 3;
      inCampaignSection = true;
      continue;
    } else if (trimmedLine.match(/TIER\s*4\s*CAMPAIGNS?/i) || trimmedLine.match(/^###?\s*\*?\*?TIER\s*4/i)) {
      currentTier = 4;
      inCampaignSection = true;
      continue;
    }
    
    // Stop parsing if we hit a new major section
    if (trimmedLine.match(/^##\s*[📝⚙🚀✅📊📞🎯🔧⚡]/)) {
      inCampaignSection = false;
      continue;
    }
    
    // Look for campaign headers like:
    // #### 1. T1-Search-Wellington-Invercargill
    // #### 2. T1-Search-Masterton-Nelson
    const campaignHeaderMatch = trimmedLine.match(/^####\s*\d+\.\s*(.+)$/);
    if (campaignHeaderMatch && currentTier && inCampaignSection) {
      currentCampaignName = campaignHeaderMatch[1].trim();
      continue;
    }
    
    // Look for daily budget lines like:
    // - **Daily Budget:** $46.67
    const budgetMatch = trimmedLine.match(/\*?\*?Daily Budget:?\*?\*?\s*\$?([\d,]+\.?\d*)/i);
    if (budgetMatch && currentCampaignName && currentTier) {
      const budgetStr = budgetMatch[1].replace(/,/g, '');
      const dailyBudget = parseFloat(budgetStr);
      
      if (!isNaN(dailyBudget) && dailyBudget > 0) {
        // Skip if it's marked as already created
        const nextFewLines = lines.slice(i, i + 5).join('\n');
        if (!nextFewLines.includes('ALREADY CREATED')) {
          // Check if we haven't already processed this campaign
          const campaignKey = `${currentTier}-${currentCampaignName}`;
          if (!processedCampaigns.has(campaignKey)) {
            campaigns.push({
              id: `campaign-${++campaignId}`,
              name: currentCampaignName,
              tier: currentTier as 1 | 2 | 3 | 4,
              dailyBudget: dailyBudget,
              monthlyBudget: dailyBudget * 30, // Approximate monthly budget
              status: CampaignStatus.PENDING,
            });
            processedCampaigns.add(campaignKey);
          }
        }
      }
      currentCampaignName = null;
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
    4: [],
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