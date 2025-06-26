#!/bin/bash

# Deploy script for Google Ads Campaign Creator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Google Ads Campaign Creator to AWS${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Variables
REGION="ap-southeast-2"
STACK_NAME="mg-googleads-creator-stack"
LAMBDA_BUCKET="mg-googleads-lambda-deployment"

# Create S3 bucket for Lambda deployment if it doesn't exist
echo -e "${YELLOW}📦 Creating Lambda deployment bucket...${NC}"
aws s3 mb s3://${LAMBDA_BUCKET} --region ${REGION} 2>/dev/null || true

# Package Lambda functions
echo -e "${YELLOW}📦 Packaging Lambda functions...${NC}"
cd lambdas
npm install
zip -r ../lambda-deployment.zip . -x "*.git*"
cd ..

# Upload Lambda package to S3
echo -e "${YELLOW}⬆️  Uploading Lambda package to S3...${NC}"
aws s3 cp lambda-deployment.zip s3://${LAMBDA_BUCKET}/lambda-deployment.zip

# Deploy CloudFormation stack
echo -e "${YELLOW}🏗️  Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides Environment=prod \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION} \
    --tags ClientName=MediaGiant Project="Google Ads"

# Get stack outputs
echo -e "${YELLOW}📋 Getting stack outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}API URL: ${API_URL}${NC}"

# Run tagging script
echo -e "${YELLOW}🏷️  Applying tags to additional resources...${NC}"
if [ -f "./tag-resources.sh" ]; then
    ./tag-resources.sh
else
    echo -e "${YELLOW}⚠️  tag-resources.sh not found. Please run it manually to tag CloudWatch logs and S3 bucket.${NC}"
fi

echo -e "\n${YELLOW}📝 Don't forget to:${NC}"
echo -e "  1. Update the .env file with: REACT_APP_API_URL=${API_URL}"
echo -e "  2. Add Google Ads OAuth credentials to Secrets Manager"
echo -e "  3. Deploy the React app to AWS Amplify"
echo -e "  4. Verify all resources are tagged: aws resourcegroupstaggingapi get-resources --region ${REGION} --tag-filters Key=ClientName,Values=MediaGiant"

# Clean up
rm -f lambda-deployment.zip