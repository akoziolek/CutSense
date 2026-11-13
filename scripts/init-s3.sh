#!/bin/bash
echo "==> Init S3 with LocalStack..."

awslocal s3api create-bucket --bucket "${S3_BUCKET_NAME}"

awslocal s3api put-public-access-block \
  --bucket "${S3_BUCKET_NAME}" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

awslocal s3api put-bucket-cors \
  --bucket "${S3_BUCKET_NAME}" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'

echo "==> S3 configured!!!"