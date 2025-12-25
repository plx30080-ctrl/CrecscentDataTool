# Workforce Management Application Blueprint

## Overview

This document outlines the development plan for a comprehensive workforce management application. The application will provide tools for tracking employee data, managing shifts, forecasting staffing needs, and streamlining data entry and analysis.

## Core Features

*   **Shift Tracking:** Monitor per-shift attendance, client requests, new starts, send-homes, and line cuts.
*   **Hours Tracking:** Aggregate and report hours worked by associate, shift, and total (daily, weekly, monthly, YTD).
*   **Forecasting & Recruiting:** Analyze historical and current data to forecast staffing needs and manage the recruiting pipeline.
*   **Early Leave Tracking:** Track and analyze early leave data to identify trends.
*   **Data Integration:** Automate data ingestion from various sources, including SharePoint and email.
*   **Applicant Tracking:** Manage the applicant pipeline from processing to start date.
*   **Role-Based Data Entry:** Provide a tailored data entry interface for different user roles.
*   **Historical Data Upload:** Allow users to upload historical data from a CSV file.

## Technology Stack

*   **Frontend:** React with Vite
*   **Component Library:** Material-UI (MUI)
*   **Date Management:** Day.js
*   **Routing:** React Router
*   **Backend & Database:** Firebase (Firestore, Authentication)
*   **CSV Parsing:** PapaParse

## Development Plan

### Phase 1: Foundation and Core UI

1.  **Initialize Project:** Set up a new React project using Vite.
2.  **Install Dependencies:** Install MUI, React Router, and Firebase.
3.  **Firebase Setup:** Configure Firebase and create a `firebase.js` configuration file.
4.  **Routing:** Implement basic routing for the main pages of the application.
5.  **Layout:** Create a main layout component with a navigation bar and a content area.

### Phase 2: Data Entry and User Roles

1.  **Date Selection:** Add a date picker to the main data entry page.
2.  **Role-Specific Forms:** Create detailed forms for each user role:
    *   **On-Site Manager:** Shift selection (1st/2nd), "Number Requested", "Number Required", "Number Working", "New Starts" (Name and EID), and "Send Homes".
    *   **Recruiter:** "Name", "Interviews Scheduled", "Interview Shows", "Applicants Processed", and "Daily Notes".
    *   **Market Manager:** "Hours Worked 1st Shift", "Hours Worked 2nd Shift", "Early Leaves", and "DNRs".

### Phase 3: Dashboard and Data Visualization

1.  **Shift-Tracking Dashboard:** Create a dashboard to visualize shift data.
2.  **Hours-Tracking Dashboard:** Create a dashboard for visualizing hours worked.
3.  **Charts and Graphs:** Use a charting library to display data visualizations.

### Phase 4: Historical Data Upload

1.  **Install PapaParse:** Add `papaparse` for CSV parsing.
2.  **Create Upload Page:** Build a new page at `/upload`.
3.  **File Uploader:** Implement a component for file selection and upload.
4.  **CSV Template:** Provide a downloadable CSV template.
5.  **Data Processing:** Implement the logic to parse the uploaded CSV file.

### Phase 5: Backend Integration and Automation

1.  **Firestore Schema:** Design and implement the Firestore database schema.
2.  **Data-Entry Logic:** Connect the data entry forms to Firestore.
3.  **Data-Integration:** Explore options for integrating with SharePoint and email.

### Phase 6: Advanced Features

1.  **Forecasting Tool:** Develop an algorithm for forecasting staffing needs.
2.  **Applicant-Tracking System:** Build a system for managing the applicant pipeline.

## Current Task

Enhance the data entry forms with detailed, role-specific fields and a date picker for selecting the submission date.
