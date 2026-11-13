#!/usr/bin/env bash
# Publica o Mundo da Bia na AWS: bucket privado no S3 e CloudFront.
#
# Uso:
#   aws configure
#   ./scripts/deploy-aws.sh
#
# Opcionais:
#   AWS_REGION   padrão sa-east-1 (origem em São Paulo; a borda do CloudFront é global)
#   AWS_BUCKET   padrão mundo-da-bia-ACCOUNT_ID (o nome do bucket é global)
#   DEPLOY_YES=1 pula a confirmação
#
# Não cria a conta AWS nem o cartão. Não cria domínio no Route 53.
# O plano é o pay-as-you-go do CloudFront: o primeiro 1 TB/mês na América do Sul entra na cota gratuita.
# Rodar de novo reaproveita bucket, distribuição e políticas.
set -euo pipefail

cd "$(dirname "$0")/.."

REGION="${AWS_REGION:-sa-east-1}"
CACHE_POLICY_NAME="Managed-CachingOptimized"

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "AWS sem sessão válida. Rode: aws configure" >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${AWS_BUCKET:-mundo-da-bia-${ACCOUNT}}"
ORIGIN_ID="s3-mundo-da-bia"
COMMENT="mundo-da-bia"

if [[ ! "$BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "AWS_BUCKET inválido: ${BUCKET}" >&2
  exit 1
fi

query_or_empty() {
  local value
  value="$("$@" --output text 2>/dev/null || true)"
  if [[ -z "$value" || "$value" == "None" ]]; then
    echo ""
  else
    echo "$value"
  fi
}

sha="$(git rev-parse --short HEAD 2>/dev/null || echo "sem-git")"
dirty=""
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  dirty=" (árvore suja — isto publica o disco, não um SHA limpo)"
fi

cat <<EOF
Conta:    ${ACCOUNT}
Bucket:   ${BUCKET} (${REGION})
CDN:      CloudFront, todas as bordas, inclusive a América do Sul
SHA:      ${sha}${dirty}

Isso cria o bucket privado e a distribuição, faz o build e publica o dist.
A URL fica em *.cloudfront.net. O save continua no navegador.
O primeiro 1 TB/mês e 10 milhões de pedidos do CloudFront são gratuitos.
EOF

if [[ "${DEPLOY_YES:-}" != "1" ]]; then
  read -r -p "Continuar? [s/N] " answer
  [[ "${answer}" == "s" || "${answer}" == "S" ]] || exit 1
fi

if aws s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
  echo "Bucket ${BUCKET} já existe."
else
  aws s3api create-bucket \
    --bucket "${BUCKET}" \
    --region "${REGION}" \
    --create-bucket-configuration "LocationConstraint=${REGION}"
fi

aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption \
  --bucket "${BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'

OAC_ID="$(query_or_empty aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${COMMENT}'].Id | [0]")"
if [[ -z "$OAC_ID" ]]; then
  OAC_ID="$(aws cloudfront create-origin-access-control --origin-access-control-config "{
    \"Name\": \"${COMMENT}\",
    \"Description\": \"Leitura do bucket do Mundo da Bia\",
    \"SigningProtocol\": \"sigv4\",
    \"SigningBehavior\": \"always\",
    \"OriginAccessControlOriginType\": \"s3\"
  }" --query 'OriginAccessControl.Id' --output text)"
fi

HEADERS_ID="$(query_or_empty aws cloudfront list-response-headers-policies --type custom --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='${COMMENT}'].ResponseHeadersPolicy.Id | [0]")"
if [[ -z "$HEADERS_ID" ]]; then
  HEADERS_ID="$(aws cloudfront create-response-headers-policy --response-headers-policy-config "{
    \"Name\": \"${COMMENT}\",
    \"Comment\": \"noindex e nosniff\",
    \"SecurityHeadersConfig\": {
      \"ContentTypeOptions\": {\"Override\": true},
      \"ReferrerPolicy\": {\"Override\": true, \"ReferrerPolicy\": \"no-referrer\"}
    },
    \"CustomHeadersConfig\": {
      \"Quantity\": 1,
      \"Items\": [{\"Header\": \"X-Robots-Tag\", \"Value\": \"noindex, nofollow\", \"Override\": true}]
    }
  }" --query 'ResponseHeadersPolicy.Id' --output text)"
fi

CACHE_POLICY_ID="$(aws cloudfront list-cache-policies --type managed --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='${CACHE_POLICY_NAME}'].CachePolicy.Id | [0]" --output text)"

DIST_ID="$(query_or_empty aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='${COMMENT}'].Id | [0]")"
if [[ -z "$DIST_ID" ]]; then
  config="$(mktemp)"
  cat >"${config}" <<EOF
{
  "CallerReference": "${COMMENT}-${ACCOUNT}-$(date +%s)",
  "Comment": "${COMMENT}",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_All",
  "HttpVersion": "http2and3",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "${ORIGIN_ID}",
      "DomainName": "${BUCKET}.s3.${REGION}.amazonaws.com",
      "OriginAccessControlId": "${OAC_ID}",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "ConnectionAttempts": 3,
      "ConnectionTimeout": 10
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "${ORIGIN_ID}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "${CACHE_POLICY_ID}",
    "ResponseHeadersPolicyId": "${HEADERS_ID}",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "TrustedSigners": { "Enabled": false, "Quantity": 0 }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {"ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0},
      {"ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0}
    ]
  },
  "ViewerCertificate": { "CloudFrontDefaultCertificate": true }
}
EOF
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "file://${config}" --query 'Distribution.Id' --output text)"
  rm -f "${config}"
fi

aws s3api put-bucket-policy --bucket "${BUCKET}" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"CloudFrontRead\",
    \"Effect\": \"Allow\",
    \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::${BUCKET}/*\",
    \"Condition\": {\"StringEquals\": {\"AWS:SourceArn\": \"arn:aws:cloudfront::${ACCOUNT}:distribution/${DIST_ID}\"}}
  }]
}"

npm ci
npm run build

aws s3 sync dist "s3://${BUCKET}" --region "${REGION}" --delete --cache-control "no-cache"
aws s3 cp dist/assets "s3://${BUCKET}/assets" --region "${REGION}" --recursive --cache-control "public, max-age=31536000, immutable"

aws cloudfront create-invalidation --distribution-id "${DIST_ID}" --paths "/*" >/dev/null

status="$(aws cloudfront get-distribution --id "${DIST_ID}" --query 'Distribution.Status' --output text)"
if [[ "$status" != "Deployed" ]]; then
  echo "Aguardando o CloudFront ficar pronto. A primeira vez leva alguns minutos."
  aws cloudfront wait distribution-deployed --id "${DIST_ID}"
fi

domain="$(aws cloudfront get-distribution --id "${DIST_ID}" --query 'Distribution.DomainName' --output text)"
echo "No ar: https://${domain}"
echo "Bucket: ${BUCKET}"
