const AWS = require('aws-sdk');
const { GoogleAdsApi } = require('google-ads-api');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'ap-southeast-2'
});
const secretsManager = new AWS.SecretsManager({
  region: 'ap-southeast-2'
});

const TABLE_NAME = 'mg-googleads-campaign-jobs';

// Helper function to get OAuth credentials from Secrets Manager
async function getOAuthCredentials() {
  try {
    const secretName = 'mg-googleads-oauth-credentials';
    const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    return JSON.parse(secret.SecretString);
  } catch (error) {
    console.error('Error retrieving OAuth credentials:', error);
    throw error;
  }
}

// Helper function to update campaign status in DynamoDB
async function updateCampaignStatus(jobId, campaignId, status, error = null) {
  try {
    const job = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { jobId }
    }).promise();
    
    if (!job.Item) {
      throw new Error('Job not found');
    }
    
    const updatedCampaigns = job.Item.campaigns.map(campaign => {
      if (campaign.id === campaignId) {
        return {
          ...campaign,
          status,
          ...(error && { error })
        };
      }
      return campaign;
    });
    
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { jobId },
      UpdateExpression: 'SET campaigns = :campaigns',
      ExpressionAttributeValues: {
        ':campaigns': updatedCampaigns
      }
    }).promise();
    
  } catch (error) {
    console.error('Error updating campaign status:', error);
  }
}

// Main campaign creation function
async function createCampaign(client, accountId, campaign) {
  const customer = client.Customer({
    customer_id: accountId,
    refresh_token: client.refresh_token,
  });
  
  try {
    // Step 1: Create budget
    const budgetResource = {
      name: `${campaign.name} - Budget`,
      amount_micros: Math.round(campaign.dailyBudget * 1000000),
      delivery_method: 'STANDARD',
    };
    
    const budgetOperation = {
      create: budgetResource,
    };
    
    const budgetResponse = await customer.campaignBudgets.create([budgetOperation]);
    const budgetResourceName = budgetResponse.results[0].resource_name;
    
    // Step 2: Create campaign
    const campaignResource = {
      name: campaign.name,
      campaign_budget: budgetResourceName,
      status: 'PAUSED', // Start paused for safety
      advertising_channel_type: 'SEARCH',
      bidding_strategy_type: 'MAXIMIZE_CLICKS',
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
      },
      geo_target_type_setting: {
        positive_geo_target_type: 'PRESENCE_OR_INTEREST',
        negative_geo_target_type: 'PRESENCE',
      },
    };
    
    const campaignOperation = {
      create: campaignResource,
    };
    
    const campaignResponse = await customer.campaigns.create([campaignOperation]);
    const campaignResourceName = campaignResponse.results[0].resource_name;
    
    // Step 3: Add location targeting (New Zealand)
    const locationOperation = {
      create: {
        campaign: campaignResourceName,
        location: 'geoTargetConstants/2554', // New Zealand
      },
    };
    
    await customer.campaignCriteria.create([locationOperation]);
    
    // Step 4: Add language targeting (English)
    const languageOperation = {
      create: {
        campaign: campaignResourceName,
        language: 'languageConstants/1000', // English
      },
    };
    
    await customer.campaignCriteria.create([languageOperation]);
    
    return { success: true, campaignResourceName };
    
  } catch (error) {
    console.error(`Error creating campaign ${campaign.name}:`, error);
    return { success: false, error: error.message };
  }
}

exports.handler = async (event) => {
  console.log('DynamoDB Stream Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get OAuth credentials
    const credentials = await getOAuthCredentials();
    
    // Initialize Google Ads client
    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      developer_token: credentials.developer_token,
    });
    
    // Process each record in the stream
    for (const record of event.Records) {
      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
        
        // Only process if status is 'pending'
        if (newImage.status === 'pending') {
          const { jobId, accountId, campaigns } = newImage;
          
          // Update job status to in_progress
          await dynamodb.update({
            TableName: TABLE_NAME,
            Key: { jobId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': 'in_progress' }
          }).promise();
          
          // Process each campaign
          for (const campaign of campaigns) {
            if (campaign.status === 'pending') {
              // Update status to creating
              await updateCampaignStatus(jobId, campaign.id, 'creating');
              
              // Create the campaign
              const result = await createCampaign(client, accountId, campaign);
              
              if (result.success) {
                await updateCampaignStatus(jobId, campaign.id, 'completed');
              } else {
                await updateCampaignStatus(jobId, campaign.id, 'failed', result.error);
              }
              
              // Add delay to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          // Update completion timestamp
          await dynamodb.update({
            TableName: TABLE_NAME,
            Key: { jobId },
            UpdateExpression: 'SET completedAt = :completedAt',
            ExpressionAttributeValues: {
              ':completedAt': new Date().toISOString()
            }
          }).promise();
        }
      }
    }
    
    return { statusCode: 200 };
    
  } catch (error) {
    console.error('Error processing stream:', error);
    return { statusCode: 500, error: error.message };
  }
};