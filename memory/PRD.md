# TB Detect AI - Product Requirements Document

## Original Problem Statement
Build a full-stack, modern, responsive web application for an AI-based Tuberculosis Detection System using chest X-ray images. Professional medical UI with glassmorphism, dark theme, Grad-CAM heatmap visualization, PDF reports, JWT auth.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI + TensorFlow/Keras + MongoDB + ReportLab
- **Auth**: JWT (httpOnly cookies) with bcrypt password hashing
- **AI Model**: User-provided CNN (.keras format), input 224x224 RGB, binary classification (TB vs Normal)
- **Explainability**: Grad-CAM heatmap from last conv layer (conv2d_2)

## User Personas
- **Medical Professional**: Uploads chest X-rays, reviews AI predictions, downloads PDF reports
- **Admin**: System oversight, same capabilities as medical professional

## Core Requirements (Static)
1. Landing page with hero section and CTA
2. JWT authentication (login/signup)
3. Dashboard with scan statistics and recent scans
4. X-ray upload with drag-and-drop
5. AI prediction with TB probability score
6. Grad-CAM heatmap visualization (side-by-side)
7. PDF report generation with medical formatting
8. About page explaining CNN and Grad-CAM
9. Dark medical theme with glassmorphism UI

## What's Been Implemented (Feb 2026)
- [x] Landing page with hero section, feature cards, CTA buttons
- [x] JWT authentication (register, login, logout, refresh)
- [x] Admin seeding on startup
- [x] Protected routes with auth context
- [x] Dashboard with animated stat counters, recent scans, quick actions
- [x] Analysis page with drag-and-drop upload, image preview
- [x] TensorFlow model integration for TB prediction
- [x] Grad-CAM heatmap generation and overlay
- [x] Results display with probability, progress bar, severity badge
- [x] PDF report generation (ReportLab) with patient info, images, clinical interpretation
- [x] Reports page with scan history, expandable details, PDF download
- [x] About page with AI pipeline steps, CNN/Grad-CAM explanation
- [x] Sidebar navigation (glassmorphism)
- [x] Responsive design (mobile + desktop)
- [x] Brute force protection on login
- [x] Dark medical theme (Outfit/IBM Plex Sans/JetBrains Mono fonts)

## Prioritized Backlog
### P0 (None - Core complete)
### P1
- Add patient details form before/during analysis (name, age, gender)
- Batch upload (multiple X-rays at once)
### P2
- Admin dashboard showing all users' scans
- Password reset / forgot password flow
- Export scan history as CSV
- Role-based access control
- Email notifications for critical TB detections

## Next Tasks
1. Add patient info form to analysis workflow (pre-fill PDF reports)
2. Implement forgot-password / reset-password flow
3. Add chart visualizations to dashboard (scan trend over time)
4. Implement batch X-ray upload support
