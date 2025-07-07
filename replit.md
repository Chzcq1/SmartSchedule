# Timetable Web Application

## Overview

This is a Thai-language interactive timetable web application that allows users to manage academic schedules, subjects, and terms. The application is built using vanilla HTML, CSS, and JavaScript with Firebase as the backend database for real-time data synchronization.

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript, no frontend framework
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox
- **Thai Language Support**: All UI elements and content are in Thai
- **Modern CSS**: Uses CSS custom properties, animations, and modern layout techniques

### Backend Architecture
- **Firebase Realtime Database**: NoSQL database for storing timetable data
- **Real-time Synchronization**: Automatic updates across all connected clients
- **Serverless**: No traditional backend server, relies entirely on Firebase services

### Data Storage
- **Firebase Realtime Database**: Stores all application data in JSON format
- **Client-side State Management**: Local variables for current session data
- **No Local Storage**: All data persists in Firebase cloud database

## Key Components

### 1. Term Management
- Users can create and select different academic terms
- Each term contains its own set of subjects and timetable data
- Term selection affects all other data displays

### 2. Subject Management
- Add and manage academic subjects
- Each subject can have multiple time slots throughout the week
- Subject data is associated with specific terms

### 3. Timetable Grid
- 24-hour time slot system (08:00 - 19:30)
- 7-day week display with Thai day names
- Interactive grid for scheduling subjects
- Visual representation of weekly schedule

### 4. Additional Features
- Todo list management
- Holiday tracking
- Week navigation
- Current date display
- Loading states and error handling

## Data Flow

1. **Application Initialization**:
   - Load Firebase configuration
   - Initialize database connection
   - Load terms from Firebase
   - Set current date and week
   - Load all data for selected term

2. **User Interactions**:
   - Term selection triggers data reload
   - Subject additions sync to Firebase
   - Timetable changes update Firebase immediately
   - All changes reflect in real-time across clients

3. **Data Structure**:
   ```
   Firebase Database Structure:
   - terms/
     - termId/
       - name: string
       - subjects: object
       - timetable: object
       - todos: object
       - holidays: object
   ```

## External Dependencies

### Frontend Libraries
- **Font Awesome 6.0.0**: Icons for UI elements
- **Google Fonts (Sarabun)**: Thai language font support

### Backend Services
- **Firebase SDK**: Realtime Database functionality
- **Firebase Configuration**: Project-specific settings (requires setup)

### Browser APIs
- **Date API**: For current date and week calculations
- **DOM API**: For dynamic content manipulation
- **Event API**: For user interaction handling

## Deployment Strategy

### Current Setup
- **Static Hosting**: Can be deployed to any static hosting service
- **Firebase Integration**: Requires Firebase project configuration
- **CDN Dependencies**: External libraries loaded via CDN

### Configuration Requirements
1. Update `firebase-config.js` with actual Firebase project credentials
2. Set up Firebase Realtime Database with appropriate security rules
3. Configure authentication if needed (currently uses anonymous access)

### Deployment Options
- **Firebase Hosting**: Natural choice given Firebase backend
- **GitHub Pages**: For static hosting
- **Netlify/Vercel**: For modern static deployment
- **Any web server**: Serves static files

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 07, 2025. Initial setup