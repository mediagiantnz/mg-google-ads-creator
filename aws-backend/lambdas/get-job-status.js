const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'ap-southeast-2'
});

const TABLE_NAME = 'mg-googleads-campaign-jobs';

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const { jobId } = event.pathParameters;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Missing jobId parameter'
        })
      };
    }
    
    // Get job from DynamoDB
    const result = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { jobId }
    }).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Job not found'
        })
      };
    }
    
    const job = result.Item;
    
    // Calculate job status based on campaign statuses
    const campaignStatuses = job.campaigns.map(c => c.status);
    let overallStatus = job.status;
    
    if (campaignStatuses.every(s => s === 'completed')) {
      overallStatus = 'completed';
    } else if (campaignStatuses.some(s => s === 'failed') && 
               campaignStatuses.every(s => s === 'completed' || s === 'failed')) {
      overallStatus = 'failed';
    } else if (campaignStatuses.some(s => s === 'creating')) {
      overallStatus = 'in_progress';
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        job: {
          ...job,
          status: overallStatus
        }
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