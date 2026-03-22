#!/usr/bin/env bash
# =============================================================================
# Evaluvate AI — Provision Shared Infrastructure
#
# Run this ONCE when first setting up Evaluvate on Azure.
# Creates all shared resources that all schools use.
#
# After running, copy the output values into:
#   - backend/.env  (for local development)
#   - Azure Function App Configuration  (for production)
#   - GitHub Secrets  (for CI/CD — see docs/GITHUB_SECRETS_SETUP.md)
#
# USAGE:
#   chmod +x provision-shared.sh
#   AZURE_SUBSCRIPTION_ID=your-sub-id ./provision-shared.sh
#
# REQUIRED:
#   AZURE_SUBSCRIPTION_ID — your Azure subscription ID
#   az login already done
# =============================================================================

set -euo pipefail

: "${AZURE_SUBSCRIPTION_ID:?ERROR: AZURE_SUBSCRIPTION_ID must be set}"

REGION="centralindia"       # MUST be India — DPDP Act data localisation requirement
RG="evaluvate-shared"
COSMOS_ACCOUNT="evaluvate-cosmos-$(openssl rand -hex 4)"   # Unique name
STORAGE_ACCOUNT="evaluvatestg$(openssl rand -hex 4)"        # Unique, lowercase, max 24 chars
FUNCTIONS_APP="evaluvate-functions-production"
STATIC_WEB_APP="evaluvate-frontend"

echo ""
echo "============================================================"
echo "  Evaluvate AI — Shared Infrastructure Setup"
echo "============================================================"
echo "  Subscription: $AZURE_SUBSCRIPTION_ID"
echo "  Region:       $REGION  (India — DPDP Act requirement)"
echo "  Resource Grp: $RG"
echo "  Cosmos DB:    $COSMOS_ACCOUNT"
echo "  Storage:      $STORAGE_ACCOUNT"
echo "============================================================"
echo ""
read -p "This creates billable Azure resources. Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then echo "Aborted."; exit 0; fi

echo ""
echo "Step 1/7: Creating shared resource group..."
az group create \
  --name "$RG" \
  --location "$REGION" \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --tags "environment=production" "managed-by=evaluvate" \
  --output none
echo "  ✓ Resource group: $RG"

echo "Step 2/7: Creating Azure Cosmos DB account (serverless)..."
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RG" \
  --locations "regionName=$REGION" \
  --default-consistency-level "Session" \
  --capabilities "EnableServerless" \
  --output none
echo "  ✓ Cosmos DB: $COSMOS_ACCOUNT (serverless — zero cost when idle)"

echo "Step 3/7: Creating Azure Blob Storage account..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --location "$REGION" \
  --sku "Standard_LRS" \
  --kind "StorageV2" \
  --https-only true \
  --min-tls-version "TLS1_2" \
  --output none
echo "  ✓ Storage account: $STORAGE_ACCOUNT"

echo "Step 4/7: Configuring CORS on Blob Storage..."
az storage cors add \
  --account-name "$STORAGE_ACCOUNT" \
  --services b \
  --methods PUT GET \
  --origins "http://localhost:8080" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 300 \
  --output none
echo "  ✓ CORS configured (localhost:8080 for development)"
echo "  ⚠  Update CORS with production domain after deploying frontend"

echo "Step 5/7: Creating Azure Functions App..."
# Create storage for Functions runtime (separate from answer sheet storage)
FUNCTIONS_STORAGE="evaluvatefn$(openssl rand -hex 4)"
az storage account create \
  --name "$FUNCTIONS_STORAGE" \
  --resource-group "$RG" \
  --location "$REGION" \
  --sku "Standard_LRS" \
  --output none

az functionapp create \
  --name "$FUNCTIONS_APP" \
  --resource-group "$RG" \
  --storage-account "$FUNCTIONS_STORAGE" \
  --consumption-plan-location "$REGION" \
  --runtime "node" \
  --runtime-version "20" \
  --functions-version "4" \
  --os-type "Linux" \
  --output none
echo "  ✓ Function App: $FUNCTIONS_APP"

echo "Step 6/7: Creating Azure Static Web App..."
az staticwebapp create \
  --name "$STATIC_WEB_APP" \
  --resource-group "$RG" \
  --location "$REGION" \
  --sku "Free" \
  --output none
echo "  ✓ Static Web App: $STATIC_WEB_APP"

echo "Step 7/7: Fetching connection strings..."
COSMOS_CONN=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RG" \
  --type "connection-strings" \
  --query "connectionStrings[0].connectionString" -o tsv)

STORAGE_CONN=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --query "connectionString" -o tsv)

SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$STATIC_WEB_APP" \
  --resource-group "$RG" \
  --query "properties.apiKey" -o tsv)

DEPLOY_PRINCIPAL=$(az ad sp create-for-rbac \
  --name "evaluvate-github-deploy" \
  --role "contributor" \
  --scopes "/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$RG" \
  --sdk-auth 2>/dev/null)

echo ""
echo "============================================================"
echo "  ✅  Shared infrastructure created!"
echo "============================================================"
echo ""
echo "COPY THESE VALUES — you need them in the next steps:"
echo ""
echo "── backend/.env and Azure Function App Configuration ───────"
echo "COSMOS_CONNECTION_STRING=$COSMOS_CONN"
echo "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONN"
echo ""
echo "── GitHub Secrets (Settings → Secrets → Actions) ────────────"
echo "AZURE_FUNCTIONAPP_NAME=$FUNCTIONS_APP"
echo "AZURE_STATIC_WEB_APPS_API_TOKEN=$SWA_TOKEN"
echo ""
echo "AZURE_CREDENTIALS (paste the entire JSON block below):"
echo "$DEPLOY_PRINCIPAL"
echo ""
echo "── GitHub Variables (Settings → Variables → Actions) ────────"
echo "POC_SCHOOL_ID=school_poc_001"
echo ""
echo "── Next steps ───────────────────────────────────────────────"
echo "1. Add all secrets/variables above to GitHub (see docs/GITHUB_SECRETS_SETUP.md)"
echo "2. Add GEMINI_API_KEY and other backend secrets to Azure Function App Configuration"
echo "3. Run provision-school.sh to create your first school"
echo "4. Push to main to trigger the first deployment"
echo ""
echo "Export these for use with provision-school.sh:"
echo "export AZURE_COSMOS_ACCOUNT=$COSMOS_ACCOUNT"
echo "export AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT"
echo "export AZURE_RESOURCE_GROUP=$RG"
