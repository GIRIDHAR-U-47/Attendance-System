# 📚 REC Smart Campus Attendance & Tracking System: Documentation

This document provides a comprehensive overview of the **Rajalakshmi Engineering College (REC)** Smart Campus system, including its architecture, technical implementation, and security features.

---

## 📑 Table of Contents
1. [System Architecture Overview](#-system-architecture-overview)
2. [Technical Breakdown](#-technical-breakdown)
   - [Backend (Django REST Framework)](#backend-django-rest-framework)
   - [Mobile App (React Native + Expo)](#mobile-app-react-native--expo)
   - [Admin Dashboard (React + Vite)](#admin-dashboard-react--vite)
3. [Core Algorithms & Security](#-core-algorithms--security)
   - [Geofencing (Point-in-Polygon)](#geofencing-point-in-polygon)
   - [Device-User Binding (IP Lock)](#device-user-binding-ip-lock)
4. [Database Schema](#-database-schema)
5. [Feature Roadmap](#-feature-roadmap)
6. [Setup & Installation](#-setup--installation)

---

## 🏗 System Architecture Overview

The system is built on a **Three-Tier Architecture**, ensuring modularity, scalability, and real-time data synchronization.

1.  **The Brain (Backend)**: A Django REST Monolith that manages the source of truth, performs geometric calculations, and enforces security protocols.
2.  **The Edge (Mobile)**: A student-facing React Native app that acts as a secure sensor, streaming GPS data and providing academic details.
3.  **The Eye (Admin Dashboard)**: A high-performance React web portal using Leaflet for spatial visualization and institutional oversight.

---

## 🛠 Technical Breakdown

### Backend (Django REST Framework)
- **Role**: Data persistence, API management, and Geometric validation.
- **Key Files**:
    - `api/models.py`: Defines the database structure.
    - `api/views.py`: Contains the Ray-Casting algorithm and Authentication logic.
    - `populate_db.py`: A script to seed the database with precise campus boundary coordinates.

### Mobile App (React Native + Expo)
- **Role**: Student interaction and real-time location streaming.
- **Key Features**:
    - **Geofenced Login**: Students cannot enter the app unless they are physically within a `CampusZone`.
    - **Background Tracking**: Uses high-accuracy GPS to update the server every 5 seconds.
    - **Advanced Attendance UI**: Groups records by Subject Name and splits them into **Lecture** and **Practical** percentages.
    - **Academic Hub**: Fetches PDF notes and links uploaded by faculty.

### Admin Dashboard (React + Vite)
- **Role**: Institutional monitoring and real-time analytics.
- **Key Features**:
    - **Live Map**: Plots campus zones as polygons and students as moving markers.
    - **Instant Metrics**: Real-time counters for "Total Students", "Students On-Campus", and "Attendance Rate".
    - **Student Locator**: Clicking a student name in the side panel automatically pans and zooms the map to their current location.

---

## 🔐 Core Algorithms & Security

### Geofencing (Point-in-Polygon)
The system uses a **Ray-Casting Algorithm** to validate location without requiring complex GIS databases like PostGIS.
- **How it works**: For every GPS ping, the backend casts a ray from the student's coordinate. If the ray crosses the polygon edges an odd number of times, the student is inside.
- **Implementation**: Located in `backend/api/views.py` as `is_point_in_polygon`.

### Device-User Binding (IP Lock)

To prevent students from logging in for their friends:
1.  **Initial Registration**: On the first login, the student's `device_ip` is captured and permanently bound to their profile.
2.  **Duplicate Block**: If a device IP is already tied to one user, no other user can log in from that same device.
3.  **Account Lock**: If a user tries to log in from a different IP/device, the system blocks access.

### Movement Validation
- **Status Persistence**: The app tracks movement in the background.
- **Security Check**: If the system detects **3 consecutive pings** outside the campus boundary, the student is automatically logged out for "Security Violation."

---

## 📊 Database Schema

| Table | Key Fields | Purpose |
| :--- | :--- | :--- |
| **User** | `role`, `rfid_tag`, `device_ip` | Custom auth for Students, Faculty, and Admins. |
| **CampusZone** | `name`, `polygon_coordinates` | Stores list of LAT/LNG pairs for campus boundaries. |
| **LocationRecord** | `student`, `latitude`, `longitude`, `in_campus` | Historical logs for tracking and security audits. |
| **Attendance** | `subject`, `date`, `status` | Academic records (Present/Absent). |
| **Note** | `title`, `subject`, `file_url` | Course material repository. |

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (Default: port 5433)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python populate_db.py  # Critical: Seeds the Geofence Polygons
python manage.py runserver 0.0.0.0:8000
```

### 2. Admin Web
```bash
cd admin-dashboard
npm install
npm run dev
```

### 3. Mobile App
```bash
cd mobile
npm install
# Note: Update API_URL in App.js to your local IPv4
npx expo start
```

---

## 🔮 Feature Roadmap
- [ ] **Face Recognition Integration**: Use camera validation during login.
- [ ] **Push Notifications**: Alert students if they are about to be logged out.
- [ ] **Heatmaps**: Admin view showing high-density student areas on campus.
- [ ] **Offline Mode**: Cache attendance data when internet connectivity is poor.

---
*Generated for Rajalakshmi Engineering College (REC) Infrastructure Modernization.*
