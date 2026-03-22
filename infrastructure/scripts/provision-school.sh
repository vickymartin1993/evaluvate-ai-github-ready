#!/usr/bin/env bash
# =============================================================================
# Evaluvate AI — Provision a New School
#
# Creates the Azure resource group, Cosmos DB database, and Blob Storage
# containers for one school. Run this once per school when they join.
#
# USAGE:
#   chmod +x provision-school.sh
#   ./provision-school.sh \
#     --school-id "school_st_josephs" \
#     --school-name "St. Joseph's Higher Secondary" \
#     --city "Madurai" \
#     --state "Tamil Nadu" \
#     --contact-email "admin@stjosephs.edu.in"
#
# PREREQUISITES:
#   - Azure CLI installed and logged in (az login)
#   - provision-shared.sh already run (shared infrastructure exists)
#   - Environment variables set (see below)
#
# REQUIRED ENVIRONMENT VARIABLES (set these before running):
#   AZURE_SUBSCRIPTION_ID   Your Azure subscription ID
#   AZURE_COSMOS_ACCOUNT    Name of the shared Cosmos DB account
#   AZURE_STORAGE_ACCOUNT   Name of the shared Storage account
#   AZURE_RESOURCE_GROUP    Name of the shared resource group
# =============================================================================

set -euo pipefail  # Exit on any error, undefined variable, or pipe failure

# ── Parse arguments ───────────────────────────────────────────────────────────
SCHOOL_ID=""
SCHOOL_NAME=""
CITY=""
STATE=""
CONTACT_EMAIL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --school-id)     SCHOOL_ID="$2";      shift 2 ;;
    --school-name)   SCHOOL_NAME="$2";    shift 2 ;;
    --city)          CITY="$2";           shift 2 ;;
    --state)         STATE="$2";          shift 2 ;;
    --contact-email) CONTACT_EMAIL="$2";  shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Validate required arguments ───────────────────────────────────────────────
if [[ -z "$SCHOOL_ID" || -z "$SCHOOL_NAME" || -z "$CONTACT_EMAIL" ]]; then
  echo "ERROR: --school-id, --school-name, and --contact-email are required."
  exit 1
fi

# Validate school ID format (lowercase, underscores, no spaces)
if [[ ! "$SCHOOL_ID" =~ ^school_[a-z0-9_]+$ ]]; then
  echo "ERROR: school-id must match: school_[a-z0-9_]+"
  echo "       Example: school_st_josephs"
  exit 1
fi

# ── Required environment variables ────────────────────────────────────────────
: "${AZURE_SUBSCRIPTION_ID:?ERROR: AZURE_SUBSCRIPTION_ID environment variable is not set}"
: "${AZURE_COSMOS_ACCOUNT:?ERROR: AZURE_COSMOS_ACCOUNT environment variable is not set}"
: "${AZURE_STORAGE_ACCOUNT:?ERROR: AZURE_STORAGE_ACCOUNT environment variable is not set}"
: "${AZURE_RESOURCE_GROUP:?ERROR: AZURE_RESOURCE_GROUP environment variable is not set}"

REGION="centralindia"  # MUST be India for DPDP Act compliance
DB_PREFIX="school_"
COSMOS_DB_NAME="${DB_PREFIX}${SCHOOL_ID#school_}"  # Remove "school_" prefix to avoid duplication

echo ""
echo "============================================================"
echo "  Evaluvate AI — Provisioning New School"
echo "============================================================"
echo "  School ID:     $SCHOOL_ID"
echo "  School Name:   $SCHOOL_NAME"
echo "  City/State:    ${CITY:-N/A}, ${STATE:-N/A}"
echo "  Contact:       $CONTACT_EMAIL"
echo "  Cosmos DB:     $COSMOS_DB_NAME"
echo "  Region:        $REGION"
echo "============================================================"
echo ""
read -p "Proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ── Step 1: Create resource group (tagged for cost tracking) ──────────────────
echo ""
echo "Step 1/4: Creating resource group..."

az group create \
  --name "evaluvate-${SCHOOL_ID}" \
  --location "$REGION" \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --tags \
    "environment=production" \
    "school-id=${SCHOOL_ID}" \
    "school-name=${SCHOOL_NAME}" \
    "managed-by=evaluvate" \
    "contact=${CONTACT_EMAIL}" \
  --output none

echo "  ✓ Resource group: evaluvate-${SCHOOL_ID}"

# ── Step 2: Create Cosmos DB database for this school ─────────────────────────
echo "Step 2/4: Creating Cosmos DB database and containers..."

az cosmosdb sql database create \
  --account-name "$AZURE_COSMOS_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$COSMOS_DB_NAME" \
  --output none

echo "  ✓ Database: $COSMOS_DB_NAME"

# Create all required containers with appropriate partition keys
CONTAINERS=(
  "exams:/id"
  "students:/registrationId"
  "answer_sheets:/examId"
  "ai_scores:/answerSheetId"
  "final_marks:/examId"
  "rubrics:/id"
  "audit_events:/schoolId"
  "usage_events:/schoolId"
  "accuracy_metrics:/examId"
)

for entry in "${CONTAINERS[@]}"; do
  CONTAINER_NAME="${entry%%:*}"
  PARTITION_KEY="${entry##*:}"
  az cosmosdb sql container create \
    --account-name "$AZURE_COSMOS_ACCOUNT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --database-name "$COSMOS_DB_NAME" \
    --name "$CONTAINER_NAME" \
    --partition-key-path "$PARTITION_KEY" \
    --throughput 400 \
    --output none
  echo "  ✓ Container: $CONTAINER_NAME (partition: $PARTITION_KEY)"
done

# ── Step 3: Create Blob Storage containers for this school ────────────────────
echo "Step 3/4: Creating Blob Storage containers..."

# Answer sheets container: {schoolId}/{examId}/{studentId}/answer-sheet.pdf
az storage container create \
  --name "answer-sheets" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --public-access off \
  --output none

# Answer keys container: {schoolId}/{examId}/answer-key.txt
az storage container create \
  --name "answer-keys" \
  --account-name "$AZURE_STORAGE_ACCOUNT" \
  --public-access off \
  --output none

echo "  ✓ Blob containers: answer-sheets, answer-keys"
echo "  ℹ  School data is isolated by path prefix: ${SCHOOL_ID}/..."

# ── Step 4: Seed default rubric ───────────────────────────────────────────────
echo "Step 4/4: School provisioned. Next steps:"
echo ""
echo "  1. Add the school admin user in your auth provider (Clerk/Azure AD B2C)"
echo "     with role: 'school_admin' and schoolId: '${SCHOOL_ID}'"
echo ""
echo "  2. Share login credentials with: ${CONTACT_EMAIL}"
echo ""
echo "  3. Optionally seed starter rubrics by running:"
echo "     cd backend && npx ts-node scripts/seed-rubrics.ts --school-id ${SCHOOL_ID}"
echo ""

echo "============================================================"
echo "  ✅  School provisioned successfully!"
echo "  School ID: ${SCHOOL_ID}"
echo "  Cosmos DB: ${COSMOS_DB_NAME}"
echo "  Cost tag:  school-id=${SCHOOL_ID}"
echo "============================================================"
