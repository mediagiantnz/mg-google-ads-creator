#!/bin/bash

# Tag Resources Script for Google Ads Campaign Creator
# This script ensures all AWS resources are properly tagged

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏷️  Tagging Google Ads Campaign Creator AWS Resources${NC}"

# Variables
REGION="ap-southeast-2"
STACK_NAME="mg-googleads-creator-stack"
TAGS="ClientName=MediaGiant Project=GoogleAds"

# Function to tag a resource
tag_resource() {
    local resource_arn=$1
    local service=$2
    
    echo -e "${YELLOW}Tagging ${service} resource...${NC}"
    
    case $service in
        "lambda")
            aws lambda tag-resource \
                --resource $resource_arn \
                --tags $TAGS \
                --region $REGION 2>/dev/null || echo "Already tagged or error"
            ;;
        "dynamodb")
            aws dynamodb tag-resource \
                --resource-arn $resource_arn \
                --tags Key=ClientName,Value=MediaGiant Key=Project,Value=GoogleAds \
                --region $REGION 2>/dev/null || echo "Already tagged or error"
            ;;
        "iam")
            aws iam tag-role \
                --role-name $(echo $resource_arn | awk -F'/' '{print $NF}') \
                --tags Key=ClientName,Value=MediaGiant Key=Project,Value=GoogleAds \
                2>/dev/null || echo "Already tagged or error"
            ;;
        "secretsmanager")
            aws secretsmanager tag-resource \
                --secret-id $resource_arn \
                --tags Key=ClientName,Value=MediaGiant Key=Project,Value=GoogleAds \
                --region $REGION 2>/dev/null || echo "Already tagged or error"
            ;;
        "apigateway")
            # API Gateway tagging is done through CloudFormation
            echo "API Gateway tags managed by CloudFormation"
            ;;
        "logs")
            aws logs tag-log-group \
                --log-group-name $resource_arn \
                --tags ClientName=MediaGiant Project=GoogleAds \
                --region $REGION 2>/dev/null || echo "Already tagged or error"
            ;;
    esac
}

# Get stack resources
echo -e "${YELLOW}📋 Getting stack resources...${NC}"
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query "Stacks[0].StackStatus" \
    --output text 2>/dev/null || echo "NONE")

if [ "$STACK_EXISTS" == "NONE" ]; then
    echo -e "${RED}❌ Stack $STACK_NAME not found in region $REGION${NC}"
    exit 1
fi

# Get all resources from the stack
RESOURCES=$(aws cloudformation list-stack-resources \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query "StackResourceSummaries[*].[LogicalResourceId,ResourceType,PhysicalResourceId]" \
    --output text)

# Process each resource
while IFS=$'\t' read -r logical_id resource_type physical_id; do
    case $resource_type in
        "AWS::Lambda::Function")
            ARN="arn:aws:lambda:${REGION}:$(aws sts get-caller-identity --query Account --output text):function:${physical_id}"
            tag_resource "$ARN" "lambda"
            
            # Also tag the Lambda's CloudWatch Log Group
            LOG_GROUP="/aws/lambda/${physical_id}"
            tag_resource "$LOG_GROUP" "logs"
            ;;
        "AWS::DynamoDB::Table")
            ARN="arn:aws:dynamodb:${REGION}:$(aws sts get-caller-identity --query Account --output text):table/${physical_id}"
            tag_resource "$ARN" "dynamodb"
            ;;
        "AWS::IAM::Role")
            tag_resource "$physical_id" "iam"
            ;;
        "AWS::SecretsManager::Secret")
            tag_resource "$physical_id" "secretsmanager"
            ;;
    esac
done <<< "$RESOURCES"

# Tag S3 bucket if it exists
LAMBDA_BUCKET="mg-googleads-lambda-deployment"
if aws s3 ls "s3://${LAMBDA_BUCKET}" 2>/dev/null; then
    echo -e "${YELLOW}Tagging S3 bucket...${NC}"
    aws s3api put-bucket-tagging \
        --bucket $LAMBDA_BUCKET \
        --tagging "TagSet=[{Key=ClientName,Value=MediaGiant},{Key=Project,Value=GoogleAds}]" \
        --region $REGION 2>/dev/null || echo "Already tagged or error"
fi

# Additional manual resources to check
echo -e "${YELLOW}🔍 Checking for additional resources...${NC}"

# Check for any Lambda functions with mg-googleads prefix
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region $REGION \
    --query "Functions[?starts_with(FunctionName, 'mg-googleads')].FunctionArn" \
    --output text)

if [ ! -z "$LAMBDA_FUNCTIONS" ]; then
    for func_arn in $LAMBDA_FUNCTIONS; do
        tag_resource "$func_arn" "lambda"
    done
fi

# Check for DynamoDB tables with mg-googleads prefix
DYNAMO_TABLES=$(aws dynamodb list-tables \
    --region $REGION \
    --query "TableNames[?starts_with(@, 'mg-googleads')]" \
    --output text)

if [ ! -z "$DYNAMO_TABLES" ]; then
    for table in $DYNAMO_TABLES; do
        ARN="arn:aws:dynamodb:${REGION}:$(aws sts get-caller-identity --query Account --output text):table/${table}"
        tag_resource "$ARN" "dynamodb"
    done
fi

echo -e "${GREEN}✅ Tagging completed!${NC}"
echo -e "${YELLOW}📝 Note: Some resources like API Gateway stages are tagged through CloudFormation${NC}"

# Display tagged resources summary
echo -e "\n${GREEN}📊 Tagged Resources Summary:${NC}"
aws resourcegroupstaggingapi get-resources \
    --region $REGION \
    --tag-filters Key=ClientName,Values=MediaGiant Key=Project,Values=GoogleAds \
    --query "ResourceTagMappingList[*].[ResourceARN,Tags[?Key=='ClientName'].Value|[0]]" \
    --output table 2>/dev/null || echo "Unable to retrieve tagged resources"