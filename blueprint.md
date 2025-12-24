# Dreamscape App Blueprint

## Overview

Dreamscape is a modern, responsive React web application designed to provide a seamless user experience for authentication and future functionalities. It is built with Vite, Material-UI, and Firebase, featuring a clean and visually appealing design.

## Project Structure

- `src/`
  - `components/`: Reusable React components (e.g., `Navbar.jsx`).
  - `pages/`: Page components for different routes (e.g., `HomePage.jsx`, `LoginPage.jsx`).
  - `assets/`: Static assets like images and CSS.
  - `App.jsx`: Main application component with routing.
  - `main.jsx`: Application entry point.
  - `firebase.js`: Firebase configuration.
  - `theme.js`: Material-UI theme customization.
- `public/`: Public assets.
- `.idx/`: IDE-specific configurations.
- `blueprint.md`: This file, documenting the project.

## Design and Styling

- **Component Library:** Material-UI for a professional and consistent look and feel.
- **Theme:** A custom theme is defined in `src/theme.js` with a color palette and typography.
- **Styling:** A combination of Material-UI's `sx` prop and CSS for fine-grained control.
- **Visuals:** The app features a gradient background, glassmorphism effects on forms, and a modern, clean design.

## Implemented Features

- **User Authentication:**
  - User registration with email and password using Firebase Authentication.
  - User login and logout.
  - Dynamic navbar that adapts to the user's authentication state.
  - Protected routes for login and registration pages, redirecting authenticated users.

- **Routing:**
  - `react-router-dom` for client-side routing.
  - Routes for Home, About, Login, and Register pages.

- **UI/UX:**
  - A visually appealing home page with a hero section.
  - User-friendly forms with validation feedback.
  - A responsive design that works on different screen sizes.

## Current Plan

The next feature to be implemented is a user profile page.

- **Create Profile Page:** A new page will be created at `/profile` to display user information.
- **Protected Route:** The profile page will be a protected route, accessible only to authenticated users.
- **Display User Information:** The page will display the user's email and other relevant information.
- **Update Navbar:** A link to the profile page will be added to the navbar for logged-in users.
