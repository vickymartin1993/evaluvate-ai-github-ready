# GitHub Secrets & Variables Setup Guide

> **Read this before doing anything in GitHub.**
> This document explains every secret and variable the CI/CD pipeline needs,
> where to get the value, and exactly how to add it to GitHub.

---

## The Difference: Secrets vs Variables

| Type | Visible in logs? | Use for |
|------|-----------------|---------|
| **Secret** | Never — masked as `***` | API keys, passwords, tokens, connection strings |
| **Variable** | Yes — shown in logs | Non-sensitive config like region names, app names |

**Rule:** If it's a password or key → Secret. If it's just a name or setting → Variable.

---

## How to Add a Secret to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top tab)
3. In the left sidebar, click **Secrets and variables → Actions**
4. Click **New repository secret**
5. Enter the Name and Value exactly as shown below
6. Click **Add secret**

---

## How to Add a Variable to GitHub

Same as above, but click **New repository variable** instead of secret.

---

## Required Secrets

### `AZURE_CREDENTIALS`

**What it is:** A JSON object that lets GitHub Actions log into your Azure account
to deploy code. It represents a "service principal" — a limited-access Azure identity
created just for deployment (not your personal account).

**How to get it:**

```bash
# Run this in Azure CLI (az login first if needed)
# Replace {subscription-id} with your actual subscription ID
# You can find it: az account show --query id -o tsv

az ad sp create-for-rbac \
  --name "evaluvate-github-deploy" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/evaluvate-shared \
  --sdk-auth

# This outputs a JSON object like:
# {
#   "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
#   "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   ...
# }
```

**Copy the entire JSON output** (including the `{` and `}`) and paste it as the secret value.

---

### `AZURE_FUNCTIONAPP_NAME`

**What it is:** The name of your Azure Functions app.

**How to get it:**
- Azure Portal → Function Apps → Your app → Overview → Name
- Example value: `evaluvate-functions-production`

---

### `AZURE_STATIC_WEB_APPS_API_TOKEN`

**What it is:** A deployment token that lets GitHub Actions push the React build
to Azure Static Web Apps.

**How to get it:**
1. Azure Portal → Static Web Apps → Your app
2. Click **Manage deployment token** in the Overview panel
3. Copy the token value

---

### `GEMINI_API_KEY`

**What it is:** Your Google AI Studio API key for Gemini 2.5 Flash.

**How to get it:**
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key**
3. Copy the key (starts with `AIza...`)

**Important:** This secret is used by the Azure Functions backend to call Gemini.
It is NOT a `VITE_` variable — it never goes into the frontend bundle.
It is set in Azure Function App Configuration, not injected via GitHub Actions at build time.

---

### `AZURE_STORAGE_CONNECTION_STRING`

**What it is:** The connection string for Azure Blob Storage (where PDFs are stored).

**How to get it:**
1. Azure Portal → Storage Accounts → Your storage account
2. Left sidebar → **Security + networking → Access keys**
3. Click **Show** next to key1 → Connection string
4. Copy the full connection string

---

### `COSMOS_CONNECTION_STRING`

**What it is:** The connection string for Azure Cosmos DB (where all app data lives).

**How to get it:**
1. Azure Portal → Azure Cosmos DB → Your account
2. Left sidebar → **Settings → Keys**
3. Copy **PRIMARY CONNECTION STRING**

---

## Required Variables (not secrets)

### `POC_SCHOOL_ID`

**What it is:** The school ID used during POC deployment.
**Value:** `school_poc_001` (or whatever ID you used when running provision-school.sh)
**Why a variable and not a secret:** It's not sensitive — it's just a database prefix.

---

## Setting Backend Secrets in Azure (not GitHub)

The secrets that the *running* backend needs (Gemini key, Cosmos connection string, etc.)
are set directly in the Azure Function App — not via GitHub Actions.

This is safer: GitHub Actions only needs deployment credentials, not runtime secrets.

**How to set them in Azure:**

1. Azure Portal → Function Apps → `evaluvate-functions-production`
2. Left sidebar → **Configuration**
3. Under **Application settings**, click **+ New application setting**
4. Add each of these:

| Setting Name | Value |
|-------------|-------|
| `GEMINI_API_KEY` | Your Gemini key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint (or leave blank for POC) |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI key (or leave blank for POC) |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-4o` |
| `COSMOS_CONNECTION_STRING` | Your Cosmos DB connection string |
| `COSMOS_DB_PREFIX` | `school_` |
| `AZURE_STORAGE_CONNECTION_STRING` | Your storage connection string |
| `AZURE_STORAGE_ANSWER_SHEETS_CONTAINER` | `answer-sheets` |
| `AZURE_STORAGE_ANSWER_KEYS_CONTAINER` | `answer-keys` |
| `AZURE_STORAGE_SAS_EXPIRY_MINUTES` | `15` |
| `CONFIDENCE_THRESHOLD` | `0.70` |
| `USD_TO_INR_RATE` | `83.5` |
| `NODE_ENV` | `production` |

5. Click **Save** at the top
6. The Function App will restart automatically

---

## Summary Checklist

Before running the deploy workflow for the first time, confirm:

- [ ] `AZURE_CREDENTIALS` secret added to GitHub
- [ ] `AZURE_FUNCTIONAPP_NAME` secret added to GitHub
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` secret added to GitHub
- [ ] `POC_SCHOOL_ID` variable added to GitHub
- [ ] All backend secrets set in Azure Function App Configuration
- [ ] Azure Function App exists (created by provision-shared.sh)
- [ ] Azure Static Web App exists (created by provision-shared.sh)
- [ ] Azure Cosmos DB account exists
- [ ] Azure Blob Storage account exists

Once all boxes are checked, push to main or trigger the deploy workflow manually.
