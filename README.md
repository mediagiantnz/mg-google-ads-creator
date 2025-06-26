# Google Ads Campaign Creator

Internal tool for Media Giant to automate Google Ads campaign creation from Markdown specification files.

## Features

- Upload MD files containing campaign specifications
- Preview campaigns with budget calculations
- Batch create campaigns via Google Ads API
- Real-time progress tracking
- Export campaign creation reports

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Infrastructure**: AWS CloudFormation
- **Deployment**: AWS Amplify (Frontend), AWS SAM (Backend)

## Setup Instructions

### Prerequisites

- Node.js 18.x or higher
- AWS CLI configured with appropriate credentials
- Google Ads API access (developer token, OAuth credentials)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Update REACT_APP_API_URL with your API Gateway URL
```

3. Start development server:
```bash
npm start
```

### AWS Deployment

1. Deploy backend infrastructure:
```bash
cd aws-backend
./deploy.sh
```

2. Add Google Ads OAuth credentials to AWS Secrets Manager:
```bash
aws secretsmanager update-secret \
  --secret-id mg-googleads-oauth-credentials-prod \
  --secret-string '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "developer_token": "YOUR_DEVELOPER_TOKEN"
  }'
```

3. Build and deploy frontend:
```bash
npm run build
# Deploy build folder to AWS Amplify or S3 + CloudFront
```

## MD File Format

The tool expects MD files with campaigns organized by tiers:

```markdown
## Tier 1
Campaign Name 1 - $46.67
Campaign Name 2 - $11.67

## Tier 2
Campaign Name 3 - $5.83
Campaign Name 4 - $3.50

## Tier 3
Campaign Name 5 - $2.33
Campaign Name 6 - $1.17
```

## Campaign Settings

All campaigns are created with:
- **Type**: Search
- **Bidding**: Maximize Clicks
- **Networks**: Search + Search Partners
- **Location**: New Zealand
- **Language**: English
- **Status**: Paused (for safety)

## Environment Variables

- `REACT_APP_API_URL`: API Gateway endpoint URL
- `REACT_APP_DEBUG`: Enable debug mode (optional)

## AWS Resources

All AWS resources are tagged with:
- `ClientName`: MediaGiant
- `Project`: Google Ads

Resource naming convention: `mg-googleads-*`

## Architecture

1. User uploads MD file via React app
2. Lambda function parses file and creates job in DynamoDB
3. DynamoDB Stream triggers campaign creation Lambda
4. Campaign creation Lambda calls Google Ads API
5. Frontend polls for status updates
6. User can download completion report

## Security

- OAuth tokens stored in AWS Secrets Manager
- API Gateway with CORS configured
- DynamoDB with encryption at rest
- Lambda functions with minimal IAM permissions

## Troubleshooting

### Common Issues

1. **CORS errors**: Check API Gateway CORS configuration
2. **Authentication failures**: Verify OAuth tokens in Secrets Manager
3. **Rate limiting**: Campaign creation includes 2-second delays
4. **Failed campaigns**: Check Lambda logs in CloudWatch

### Logging

All Lambda functions log to CloudWatch Logs:
- `/aws/lambda/mg-googleads-parse-md-prod`
- `/aws/lambda/mg-googleads-get-status-prod`
- `/aws/lambda/mg-googleads-create-campaigns-prod`

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Support

For issues or questions, contact the Media Giant development team.