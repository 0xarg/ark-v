# ARKHV Platform

ARKHV is a subscription-based operations platform that allows companies to access a distributed creative and technical team through a structured request system.

Instead of hiring multiple specialists internally (designers, editors, developers, marketers), companies submit work requests inside ARKHV. These requests move through a defined workflow and are executed by the ARKHV team.

The platform acts as a **centralized workspace for operational execution**.

---

# Core Concept

ARKHV replaces fragmented freelance workflows with a centralized request management system.

Typical workflow:

Client submits request  
→ ARKHV team processes request  
→ Work delivered through the platform

Each request follows a defined lifecycle:

```
Submitted → In Progress → Review → Completed
```

The system is designed to support **continuous work queues**, allowing companies to submit multiple requests while tracking progress in a single dashboard.

---

# Product Principles

ARKHV is built around three core principles:

### Speed

Fast request submission and delivery.

### Transparency

Clear request statuses and progress tracking.

### Scalability

Companies scale operational output without increasing headcount.

---

# MVP Scope

The first version of ARKHV focuses on validating the core workflow.

Core features:

- User authentication
- Team workspaces
- Request submission system
- Request lifecycle management
- File uploads and asset storage
- Request tracking dashboard

The MVP prioritizes **simplicity, reliability, and operational clarity**.

---

# High-Level Architecture

Frontend + API  
Next.js (App Router)

Backend  
Supabase

- Authentication
- Postgres database
- Row Level Security

Storage  
Cloudflare R2 (file uploads and assets)

Deployment  
Vercel

Architecture flow:

```
Client Browser
↓
Next.js App
↓
Supabase Auth + Database
↓
Cloudflare R2 (file storage)
```

---

# Core Domain Entities

The system revolves around **Requests**.

Primary entities:

### Users

Represents a person who can access the platform.

Fields:

- id
- email
- name
- created_at

---

### Teams

Represents a company workspace.

Fields:

- id
- name
- owner_id
- created_at

---

### Team Members

Links users to teams and defines their roles.

Fields:

- id
- team_id
- user_id
- role

Roles may include:

- owner
- member
- admin
- operator

---

### Requests

The central entity representing work submitted by a team.

Fields:

- id
- team_id
- title
- description
- status
- priority
- assigned_to
- created_at
- updated_at

Status lifecycle:

```
submitted → in_progress → review → completed
```

---

### Request Files

Attachments uploaded to requests.

Stored in Cloudflare R2.

Fields:

- id
- request_id
- file_url
- uploaded_by
- created_at

---

### Comments

Communication between clients and the ARKHV team.

Fields:

- id
- request_id
- user_id
- message
- created_at

---

### Activity Logs

Tracks actions inside the platform.

Examples:

- request created
- status changed
- file uploaded
- comment added

Fields:

- id
- team_id
- user_id
- action
- metadata
- created_at

---

# Multi-Tenant Architecture

ARKHV is a **multi-tenant SaaS platform**.

Each company operates inside its own **team workspace**.

All data is scoped by `team_id`.

This ensures:

- strict data isolation
- secure access control
- scalable SaaS architecture

Example:

```
Requests
id
team_id
title
status
```

All queries must filter by `team_id`.

Supabase Row Level Security enforces this separation.

---

# Roles and Permissions

Basic permission structure:

### Owner

- manages team
- invites members
- full access

### Member

- submit requests
- view requests
- comment

### Operator (ARKHV team)

- assign requests
- update status
- upload deliverables

### Admin

- full system access

---

# Request Workflow

Request lifecycle is enforced through controlled transitions.

Valid transitions:

```
submitted → in_progress
in_progress → review
review → completed
review → in_progress (revision)
```

This ensures clear operational flow and prevents inconsistent request states.

---

# File Upload System

Files are stored in Cloudflare R2.

Upload flow:

```
Client Upload
↓
Next.js API Route
↓
Upload to R2
↓
Store file URL in database
```

Files are linked to requests.

---

# Future Platform Features

Planned platform capabilities include:

- automated task routing
- activity feeds
- real-time collaboration
- subscription billing
- usage tracking
- workflow automation
- integrations with external tools

The long-term vision is to become a **cloud-based operations platform for distributed teams**.

---

# Development Philosophy

The platform is designed to prioritize:

- clear data models
- strict request workflows
- simple UI for operational clarity
- scalable multi-tenant architecture

---

# Project Structure (Recommended)

```
app/
dashboard/
requests/
teams/
auth/

components/
ui/
requests/
dashboard/

lib/
supabase/
auth/
permissions/

services/
request-service
file-service

types/
database
request
```

---

# Summary

ARKHV is a **multi-tenant SaaS platform for operational task execution**, allowing companies to manage creative and technical work through a centralized request system handled by a distributed team.

The core system revolves around **request submission, lifecycle tracking, and team collaboration** .
