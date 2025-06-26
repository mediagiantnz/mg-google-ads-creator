# Local Development Setup

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API URL**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and set your API URL:
   ```
   REACT_APP_API_URL=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/prod
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## Getting the API URL

### Option 1: Deploy the AWS Backend (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd aws-backend
   ```

2. Deploy the infrastructure:
   ```bash
   ./deploy.sh
   ```

3. The script will output your API URL. Copy this URL and update your `.env` file.

### Option 2: Use a Mock API (For UI Testing Only)

If you just want to test the UI without deploying AWS resources, you can:

1. Keep the default placeholder URL in `.env`
2. The app will show appropriate error messages when API calls fail
3. You can still test file upload, preview UI, and navigation

## Troubleshooting

### "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"

This error means the API URL is not configured. Follow the steps above to set `REACT_APP_API_URL` in your `.env` file.

### "Cannot connect to server"

This error appears when:
- The backend is not deployed
- The API URL in `.env` is incorrect
- There's a network issue

To fix:
1. Verify the backend is deployed: `aws cloudformation describe-stacks --stack-name mg-googleads-creator-stack`
2. Check the API URL matches the CloudFormation output
3. Ensure your `.env` file is saved and the dev server is restarted

### Changes to .env not working

After modifying `.env`:
1. Stop the development server (Ctrl+C)
2. Start it again with `npm start`
3. The new environment variables will be loaded

## Testing with Sample Data

You can test the parser with the SNIP campaign file:
1. Upload the file from `/Users/andybarker/Downloads/snip_manual_campaign_creation_guide.md`
2. Enter any account ID (e.g., "7884275629")
3. The parser will extract 15 campaigns from the file

## Next Steps

Once you have the app running locally:
1. Deploy the AWS backend to get a real API URL
2. Configure Google Ads OAuth credentials in AWS Secrets Manager
3. Test the full campaign creation flow