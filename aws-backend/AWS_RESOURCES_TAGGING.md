# AWS Resources Tagging Documentation

## Required Tags
All AWS resources for the Google Ads Campaign Creator must have the following tags:
- **ClientName**: MediaGiant
- **Project**: Google Ads

## Resources Created by CloudFormation

### ✅ Tagged Resources (via CloudFormation)

1. **DynamoDB Table**
   - Resource: `mg-googleads-campaign-jobs-{Environment}`
   - Tags: Applied in CloudFormation template

2. **IAM Role**
   - Resource: `mg-googleads-lambda-role-{Environment}`
   - Tags: Applied in CloudFormation template

3. **Lambda Functions**
   - `mg-googleads-parse-md-{Environment}`
   - `mg-googleads-get-status-{Environment}`
   - `mg-googleads-create-campaigns-{Environment}`
   - Tags: Applied in CloudFormation template

4. **API Gateway**
   - Resource: `mg-googleads-api-{Environment}`
   - Tags: Applied in CloudFormation template

5. **Secrets Manager Secret**
   - Resource: `mg-googleads-oauth-credentials-{Environment}`
   - Tags: Applied in CloudFormation template

### ⚠️ Resources That Cannot Be Tagged Directly

These resources don't support tags but are associated with tagged parent resources:

1. **API Gateway Resources** (parse, status, status/{jobId})
   - Parent API Gateway is tagged

2. **API Gateway Methods** (POST /parse, GET /status/{jobId}, OPTIONS)
   - Parent API Gateway is tagged

3. **Lambda Permissions**
   - Associated with tagged Lambda functions

4. **DynamoDB Stream Event Source Mapping**
   - Associated with tagged DynamoDB table and Lambda function

5. **API Gateway Deployment**
   - Inherits tags from API Gateway

## Additional Resources (Created Outside CloudFormation)

### S3 Bucket (for Lambda deployment)
- Resource: `mg-googleads-lambda-deployment`
- Tags: Must be applied manually using the tag-resources.sh script

### CloudWatch Log Groups (Auto-created)
- `/aws/lambda/mg-googleads-parse-md-{Environment}`
- `/aws/lambda/mg-googleads-get-status-{Environment}`
- `/aws/lambda/mg-googleads-create-campaigns-{Environment}`
- Tags: Must be applied using the tag-resources.sh script

## Tagging Scripts

### Deploy with Tags
```bash
# Deploy CloudFormation stack (includes tags)
./deploy.sh
```

### Apply Tags to Additional Resources
```bash
# Run after deployment to tag S3 bucket and CloudWatch logs
./tag-resources.sh
```

### Verify All Tags
```bash
# List all resources with our tags
aws resourcegroupstaggingapi get-resources \
    --region ap-southeast-2 \
    --tag-filters Key=ClientName,Values=MediaGiant Key=Project,Values=GoogleAds \
    --output table
```

## Tag Compliance Check

To ensure all resources are properly tagged, run:

```bash
# Check for mg-googleads resources without tags
aws resourcegroupstaggingapi get-resources \
    --region ap-southeast-2 \
    --query "ResourceTagMappingList[?contains(ResourceARN, 'mg-googleads')]" \
    --output json | jq '.[] | select(.Tags | length == 0)'
```

## Cost Allocation

These tags enable:
1. **Cost tracking** by client (MediaGiant)
2. **Cost tracking** by project (Google Ads)
3. **Resource grouping** in AWS Resource Groups
4. **Billing reports** filtered by tags

## Enforcement

1. CloudFormation template enforces tags at creation
2. tag-resources.sh script applies tags to runtime-created resources
3. Regular audits should be performed using the verification commands above