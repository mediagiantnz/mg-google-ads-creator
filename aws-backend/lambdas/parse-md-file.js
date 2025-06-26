const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'ap-southeast-2'
});

const TABLE_NAME = 'mg-googleads-campaign-jobs';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body);
    const { mdContent, accountId } = body;
    
    if (!mdContent || !accountId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Missing required fields: mdContent and accountId'
        })
      };
    }
    
    // Parse MD content
    const campaigns = parseMDContent(mdContent);
    
    if (campaigns.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'No valid campaigns found in MD file'
        })
      };
    }
    
    // Create job in DynamoDB
    const jobId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const jobItem = {
      jobId,
      accountId,
      status: 'pending',
      campaigns: campaigns.map((campaign, index) => ({
        ...campaign,
        id: `${jobId}-campaign-${index + 1}`,
        status: 'pending'
      })),
      createdAt: timestamp,
      ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days TTL
    };
    
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: jobItem
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        jobId,
        message: 'Job created successfully',
        campaignCount: campaigns.length
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

function parseMDContent(content) {
  const campaigns = [];
  const lines = content.split('\\n');
  let currentTier = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Check for tier indicators
    if (trimmedLine.match(/^(Tier\\s*1|T1)/i)) {
      currentTier = 1;
      continue;
    } else if (trimmedLine.match(/^(Tier\\s*2|T2)/i)) {
      currentTier = 2;
      continue;
    } else if (trimmedLine.match(/^(Tier\\s*3|T3)/i)) {
      currentTier = 3;
      continue;
    }
    
    // Parse campaign lines
    const campaignMatch = trimmedLine.match(/^(.+?)[\\-\\:|]\\s*\\$?([\\d,]+\\.?\\d*)/);
    
    if (campaignMatch && currentTier) {
      const name = campaignMatch[1].trim();
      const budgetStr = campaignMatch[2].replace(/,/g, '');
      const dailyBudget = parseFloat(budgetStr);
      
      if (!isNaN(dailyBudget) && dailyBudget > 0) {
        campaigns.push({
          name: `T${currentTier}-${name}`,
          tier: currentTier,
          dailyBudget: dailyBudget,
          monthlyBudget: dailyBudget * 30
        });
      }
    }
  }
  
  return campaigns;
}