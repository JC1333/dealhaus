# DEALHAUS MASTER HANDOFF
# PROJECT BIBLE
## Version 3.0 — Launch Candidate
### Status: PRE-LAUNCH (Core Platform Verified)
### Last Updated: July 3, 2026

---

# 🚨 READ THIS FIRST

This document is the permanent operating manual for the DealHaus project.

It replaces all previous handoffs.

Every future ChatGPT session MUST read this document before making suggestions, writing code, modifying files, or proposing architectural changes.

This document exists so new GPT sessions can immediately continue development without rediscovering the project.

The actual DealHaus project is always the source of truth.

When documentation and code disagree, verify the code.

Never guess.

Never redesign verified architecture.

Never recreate files that already exist.

---

# TABLE OF CONTENTS

1. Executive Summary
2. Company Vision
3. Development Philosophy
4. Permanent Development Rules
5. Current Project Status
6. Verified Platform Architecture
7. Verified Database Architecture
8. Verified Workflow Architecture
9. Verified Runtime Data Flow
10. Verified Admin Workspaces
11. Verified Public Website
12. Verified API Architecture
13. Verified Launch Status
14. Verified Brokerage Lifecycle
15. Verified Automation Status
16. Verified Database State
17. Launch Checklist
18. Git Recovery Procedure
19. Future GPT Startup Protocol
20. Post Launch Roadmap

---

# EXECUTIVE SUMMARY

Project Name:

DealHaus

Platform Type:

AI-Powered Marketplace Brokerage

Business Model:

DealHaus does not own inventory.

Instead, AI automates nearly every stage of the brokerage process.

Primary objectives:

• Find inventory

• Contact sellers

• Obtain permission

• Create optimized listings

• Match buyers

• Communicate with buyers

• Assist negotiations

• Coordinate transactions

• Generate commission revenue

DealHaus is designed to become an autonomous AI brokerage platform.

The objective is NOT simply to build another marketplace.

The objective is to automate as much of the brokerage business as possible.

---

# COMPANY VISION

DealHaus is a technology company.

Furniture is only the initial launch category.

The software architecture must always remain category independent.

Supported launch marketplaces:

• Facebook Marketplace

• OfferUp

• Craigslist

Future integrations:

• eBay

• Mercari

• Etsy

• Additional regional marketplaces

Future expansion should require minimal architectural changes.

Every decision should support:

• Automation

• Revenue

• Reliability

• Scalability

• User Experience

---

# DEVELOPMENT PHILOSOPHY

Build once.

Build correctly.

Verify everything.

Avoid duplicate work.

Never redesign verified systems without necessity.

Every feature should improve one or more of the following:

• Revenue

• Automation

• Reliability

• Scalability

• User Experience

Launch always takes priority over cosmetic improvements.

---

# PERMANENT DEVELOPMENT RULES

ALWAYS:

• Verify the existing implementation before editing.

• Use the current project as the source of truth.

• Extend existing architecture whenever possible.

• Keep business logic modular.

• Test after every major change.

• Update this handoff after major milestones.

NEVER:

• Recreate existing files.

• Guess database structures.

• Guess API behavior.

• Duplicate business logic.

• Redesign working architecture without a valid reason.

---

# 10-MINUTE DEVELOPMENT RULE

This rule became permanent on July 3, 2026.

If any file cannot be repaired within approximately 10 minutes:

STOP PATCHING.

Replace the ENTIRE file.

Do NOT continue chasing JSX nesting problems.

Do NOT continue stacking temporary fixes.

Provide:

• exact filename

• complete replacement

• no partial snippets

This approach dramatically improved development speed during launch verification and is now the permanent development standard.

---

# CURRENT PROJECT STATUS

Current Stage:

PRE-LAUNCH

Overall Progress:

Approximately 95–98% complete.

The project has transitioned from feature development into release engineering.

Major feature development is considered complete.

The remaining work is verification, cleanup, production readiness, deployment, and launch.

Current priority:

LAUNCH > EVERYTHING ELSE

Unless a new issue blocks launch, no major systems should be added before release.

---

# WHAT HAS BEEN VERIFIED

The following systems have been fully verified.

Core Platform

✅ Next.js

✅ React

✅ Tailwind

✅ Supabase

✅ Authentication

✅ Admin Dashboard

Seller Pipeline

✅ Marketplace Acquisition

✅ Seller Approval

✅ Listing Preparation

✅ AI Relist

Buyer Pipeline

✅ Buyer Matching

✅ Buyer Outreach

✅ Negotiation

Marketplace

✅ Marketplace Publish Queue

Brokerage

✅ Brokerage Transactions

✅ Commission Tracking

✅ Revenue Tracking

Automation

✅ Workflow Engine

✅ Workflow Runner

✅ Workflow Monitor

✅ Workflow Control Center

Operations

✅ Exception Queue

✅ Revenue Queue

✅ Brokerage Center

The project is no longer proving concepts.

It is preparing for launch.

---

# CURRENT DEVELOPMENT PRIORITY

The remaining priorities are:

1. Final production verification

2. Remove remaining development-only debugging

3. Clean demo/test data

4. Recovery baseline commit

5. Production deployment

6. Public launch

No unrelated feature work should begin before these items are complete.

---

# VERIFIED PLATFORM ARCHITECTURE

## Public Website

Verified public entry point:

app/page.tsx

Routes directly into:

app/launch/page.tsx

The launch page is the primary customer-facing experience.

Verified sections include:

• Hero

• Marketplace Preview

• Seller Submission CTA

• How DealHaus Works

• Why Choose DealHaus

• FAQ

• Contact

• Footer

Public pages currently verified:

app/page.tsx

app/launch/page.tsx

app/marketplace/page.tsx

app/marketplace/[id]/page.tsx

app/submit/page.tsx

app/contact/page.tsx

app/privacy/page.tsx

app/terms/page.tsx

app/faq/page.tsx

Verified reusable public components:

HeroSection

PublicLaunchHome

PublicSellerSubmission

---

## Admin Application

Verified entry point:

app/admin/page.tsx

The Admin application serves as the operational command center.

Verified workspaces:

DashboardWorkspace

DealsWorkspace

IngestionWorkspace

ConversationsWorkspace

RevenueWorkspace

BuyerInquiriesWorkspace

Supporting components:

ExecutiveCommandCenter

AgentOrchestrator

WorkflowControlCenter

WorkflowMonitor

RevenueQueue

ExceptionQueue

Brokerage Center

GoLiveChecklist

AppSidebar

WorkspaceRouter

---

# VERIFIED WORKFLOW ARCHITECTURE

The autonomous workflow currently executes in this order:

Seller Workflow

↓

Relist Workflow

↓

Buyer Workflow

↓

Negotiation Workflow

↓

Marketplace Workflow

↓

Revenue Workflow

Execution order verified from:

FullWorkflowRunner.ts

WorkflowEngine.tsx

WorkflowControlCenter.tsx

WorkflowMonitor.tsx

---

# VERIFIED END-TO-END RUNTIME PIPELINE

Seller Lead

↓

Seller Outreach

↓

Seller Approved

↓

Listing Preparation

↓

AI Relist

↓

Inventory Created

↓

Marketplace Publish

↓

Buyer Matching

↓

Buyer Outreach

↓

Negotiation

↓

Brokerage Transaction Created

↓

Buyer Confirmed

↓

Seller Confirmed

↓

Meetup Completed

↓

Commission Paid

↓

Brokerage Closed

↓

Revenue Record Created

This entire pipeline has now been verified end-to-end.

---

# VERIFIED DATABASE TABLES

Seller Pipeline

seller_leads

seller_onboarding

listing_prep_tasks

ai_relist_tasks

outreach_tasks

Inventory

inventory

marketplace_publish_tasks

Buyer Pipeline

buyer_matches

buyer_outreach_tasks

buyer_conversations

buyer_conversation_messages

buyer_inquiries

Negotiation

negotiation_tasks

Brokerage

brokerage_transactions

Revenue

revenue_records

Operations

exception_tasks

ai_activity

pipeline

Authentication

profiles

Legacy supporting tables remain in the project but should not be used for future development without verification.

---

# VERIFIED API ROUTES

Seller Acquisition

/api/acquisition-run

Purpose:

Runs AI acquisition.

Creates seller leads.

Feeds seller pipeline.

---

AI Relist

/api/generate-ai-relist

Purpose:

Creates optimized inventory.

Creates AI listing content.

Moves approved listings into inventory.

---

AI Listing

/api/generate-listing

Purpose:

Manual listing generation.

Used during onboarding and testing.

---

Buyer Outreach

/api/create-buyer-outreach-task

Purpose:

Creates buyer outreach tasks.

Advances buyer pipeline.

---

Seller Status

/api/seller-lead-status

Purpose:

Updates seller workflow status.

---

Marketplace Import

/api/import-deals

Purpose:

Imports marketplace inventory.

Feeds acquisition workflows.

---

Email

/api/send-email

Purpose:

Platform email communication.

Future:

Seller automation

Buyer automation

Notifications

---

# VERIFIED COMPONENT INVENTORY

Seller Pipeline

SellerLeadQueue

OutreachReadyQueue

OutreachTaskQueue

SellerResponseQueue

SellerApprovedQueue

ListingPrepQueue

AiRelistQueue

SellerOnboarding

Buyer Pipeline

BuyerMatchAgent

BuyerOutreachPanel

BuyerOutreachTaskQueue

BuyerInquiriesWorkspace

ConversationThread

ContactPanel

RecentConversations

Deal Management

DealCard

DealFilters

DealModal

AiPipelineStats

AiPriorityQueue

AiActivityLog

AiOutreachPanel

Dashboard

ExecutiveCommandCenter

AgentOrchestrator

WorkflowControlCenter

WorkflowMonitor

GoLiveChecklist

RevenueAnalytics

MarketplaceSync

NegotiationCenter

ConversationCenter

BuyerMatchEngine

AutonomousAgents

Workflow Modules

SellerWorkflow

RelistWorkflow

BuyerWorkflow

NegotiationWorkflow

MarketplaceWorkflow

RevenueWorkflow

FullWorkflowRunner

WorkflowEngine

Workspace Modules

DashboardWorkspace

DealsWorkspace

IngestionWorkspace

ConversationsWorkspace

RevenueWorkspace

BuyerInquiriesWorkspace

---

# VERIFIED DUPLICATE PROTECTION

Verified duplicate prevention currently exists for:

Listing Preparation

AI Relist

Buyer Matching

Buyer Outreach

Negotiation

Marketplace Publish

Brokerage Transactions

Revenue Records

Every workflow verifies existing records before creating new ones.

---

# VERIFIED EXCEPTION HANDLING

Workflow failures are written into:

exception_tasks

Verified exception categories include:

workflow_negotiation_failed

workflow_marketplace_publish_failed

workflow_brokerage_transaction_failed

workflow_revenue_creation_failed

workflow_inventory_close_failed_after_revenue

Current verified status:

Open Exceptions = 0

Historical brokerage RLS exceptions have been resolved and marked resolved.

---

# VERIFIED BROKERAGE LIFECYCLE

The brokerage system has been fully verified.

Automatic Brokerage Transaction Creation

Buyer Confirmation

Seller Confirmation

Meetup Completion

Commission Payment

Invoice Status

Brokerage Closing

Revenue Creation

All database updates have been verified.

All UI actions have been verified.

Revenue automation has been verified.

This represents the final operational stage of the DealHaus transaction lifecycle.
---

# VERIFIED LAUNCH STATUS

## Overall Project Status

Current Stage:

FINAL PRE-LAUNCH

Overall Completion:

Approximately 95–98%

The DealHaus platform has transitioned from feature development into release engineering.

The primary objective is no longer building major systems.

The remaining objective is preparing the existing platform for production launch.

---

# VERIFIED AUTOMATION STATUS

The following systems have now been fully verified.

Seller Workflow

✅ Verified

Relist Workflow

✅ Verified

Buyer Workflow

✅ Verified

Negotiation Workflow

✅ Verified

Marketplace Workflow

✅ Verified

Revenue Workflow

✅ Verified

Workflow Runner

✅ Verified

Workflow Engine

✅ Verified

Workflow Monitor

✅ Verified

Workflow Control Center

✅ Verified

Operations Dashboard

✅ Verified

Brokerage Center

✅ Verified

Revenue Queue

✅ Verified

Exception Queue

✅ Verified

Latest verified workflow run:

Errors: 0

Workflow completed successfully.

No active exceptions.

No workflow failures.

---

# VERIFIED DATABASE STATE

Latest verified runtime counts:

Seller Leads

4

Listing Prep

1

AI Relist

1

Inventory

1

Marketplace Publish

1

Buyer Match

1

Buyer Outreach

1

Negotiation

1

Brokerage Transaction

1

Revenue Record

1

Open Exceptions

0

These counts verify the complete autonomous DealHaus workflow.

---

# VERIFIED GIT STATUS

Latest intentional modifications:

app/components/workflows/MarketplaceWorkflow.ts

app/components/workflows/FullWorkflowRunner.ts

app/components/workspaces/RevenueWorkspace.tsx

app/components/workspaces/WorkflowControlCenter.tsx

These files contain verified launch-ready improvements and should be committed as the next recovery baseline after final production verification.

---

# REMAINING LAUNCH CHECKLIST

The remaining launch work should proceed in this exact order.

Priority 1

Final Production Verification

Verify:

Public website

Seller submission

Authentication

Supabase

OpenAI

Workflow automation

Revenue automation

Brokerage workflow

Marketplace workflow

Priority 2

Remove any remaining development-only debugging.

Do not remove legitimate runtime error handling.

Priority 3

Clean demo and test data.

Preserve:

Database schema

Automation

Workflow history

Application architecture

Priority 4

Create the Recovery Baseline Commit.

Recommended process:

git status

git diff --stat

Verify application

Verify workflows

Stage intentional files only

Commit

Push to GitHub

Priority 5

Production Deployment

Verify:

Environment variables

Supabase production

OpenAI production

Authentication

Public website

Admin dashboard

Priority 6

Public Launch

---

# RECOVERY BASELINE PROCEDURE

Before creating the recovery baseline:

Verify application starts correctly.

Verify all workflows.

Verify no open exceptions.

Verify brokerage lifecycle.

Verify workflow runner.

Verify production configuration.

Review git status.

Review git diff.

Stage only intentional changes.

Create a descriptive recovery baseline commit.

The recovery baseline should represent a fully verified launch-ready system.

---

# FUTURE GPT STARTUP PROTOCOL

Every future GPT session should begin with the following process.

Step 1

Read this Project Bible completely.

Step 2

Verify the project.

The project—not memory—is the source of truth.

Verify:

Git

Files

Database

Workflows

Architecture

Launch checklist

Step 3

Continue from the current launch checklist.

Never begin unrelated features before launch readiness is complete.

Step 4

Verify before modifying.

Never recreate files.

Never redesign verified systems.

Never guess.

Step 5

Update this Project Bible before ending every work session.

The Project Bible should always represent the current verified state of DealHaus.

---

# POST-LAUNCH ROADMAP

The following work should begin only after public launch.

Marketplace Automation

Automatically publish listings.

Marketplace synchronization.

Marketplace URL tracking.

Automatic listing updates.

Communications

Seller email automation.

Buyer email automation.

SMS notifications.

Follow-up reminders.

AI Improvements

Dynamic pricing.

Negotiation suggestions.

Buyer qualification.

Conversation summaries.

Closing probability.

Dashboard Improvements

Revenue forecasting.

Historical analytics.

AI performance metrics.

Operational KPIs.

Workflow timing.

Expansion

Additional marketplaces.

Additional product categories.

National scaling.

Mobile application.

AI mobile notifications.

---

# GUIDING PRINCIPLE

Launch first.

Optimize second.

Every future enhancement should improve one or more of the following:

Revenue

Automation

Reliability

Scalability

User Experience

Avoid unnecessary architectural redesigns.

Extend the verified platform whenever possible.

---

# CURRENT DEVELOPMENT PHILOSOPHY

The DealHaus platform has reached the point where stability is more valuable than additional features.

The objective is to launch a reliable AI-powered brokerage platform.

Every future development decision should answer one question:

"Does this move DealHaus closer to generating revenue?"

If the answer is no, it should usually wait until after launch.

---

# END OF PROJECT BIBLE

This document is the permanent operating manual for DealHaus.

Future GPT sessions should begin here.

The project itself remains the ultimate source of truth.

Verify before modifying.

Build on the verified architecture.

Protect stability.

Prioritize launch.

Continue making DealHaus the most autonomous AI marketplace brokerage platform possible.