# JavaHost - Java/Spring Boot Hosting Platform

## Original Problem Statement
Build a website for hosting Java and Spring Boot project backends, with GitHub-based deployment. Frontend in React + Tailwind, backend in Node.js/Express (implemented as FastAPI due to platform constraints).

## User Personas
- Java/Spring Boot developers who need to deploy backend projects
- Teams managing multiple Java microservices

## Core Requirements
- GitHub repository connection & auto-deploy
- Build logs and deployment status tracking
- Environment variables management
- Project dashboard
- Custom domain support
- Email/password JWT authentication
- Maven/Gradle build tool support
- Multiple Java versions (11, 17, 21)
- Manual + Automatic deployment workflows

## What's Been Implemented (Feb 2026)
- JWT email/password authentication (login/register/logout)
- Project CRUD operations
- Deployment system with simulated build logs (terminal-style viewer)
- Environment variables management (CRUD)
- Custom domains management (CRUD)
- Project dashboard with status badges
- **Live Deployment URL banner** - Shows URL after successful deployment with Copy & Open buttons
- API endpoint, health check URL, and port displayed for deployed apps
- Clean light/minimal Swiss-design UI

## Architecture
- Backend: FastAPI + MongoDB (Motor async driver)
- Frontend: React + Tailwind + Shadcn UI
- Auth: JWT with httpOnly cookies
- Design: Swiss/high-contrast clean minimal theme

## Test Credentials
- Admin: admin@javahost.com / admin123

## Known Limitations / MOCKED Features
- **MOCKED**: Actual Java build execution - deployment shows realistic build logs but doesn't compile/run Java code (requires JVM runtime infrastructure)
- **MOCKED**: Deployment URLs are simulated (format: project-name-id.javahost.app)
- GitHub webhook receiver not implemented (auto-deploy is a toggle but actual webhook listening requires production infra)
- No real-time log streaming (logs are batch-loaded)

## Prioritized Backlog
### P0 (Critical for production)
- Real Java build execution (Docker-based runner)
- GitHub OAuth integration for repo access
- Webhook receiver for auto-deploy

### P1 (Important)
- Real-time log streaming via WebSocket
- Brute-force lockout on login (5 failed attempts)
- Password strength validation
- Project deletion confirmations

### P2 (Nice to have)
- Team collaboration / multi-user projects
- Deployment rollback
- Resource usage metrics
- Database provisioning (MySQL/PostgreSQL)
- SSL certificate management for custom domains
