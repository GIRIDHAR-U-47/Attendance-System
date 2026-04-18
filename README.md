
<h1 align="center">Smart Campus Tracking & Attendance System</h1>

<div align="center">


![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)


⚠️ **Confidential Repository**

An industry-grade Smart Campus solution integrating secure geofencing entry validation, real-time background location tracking, and an independent attendance and academic content delivery module.

</div>

---

## 📖 Table of Contents
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Geofencing Mechanism](#-geofencing-mechanism)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Backend Setup](#1-backend-setup-django)
  - [2. Admin Dashboard](#2-admin-dashboard-react--vite)
  - [3. Mobile Application](#3-mobile-application-react-native--expo)
- [API Overview](#-api-overview)

---

## 🏗 System Architecture

The project consists of three independent but seamlessly integrated components:
1. **Django REST API Backend**: Serves as the centralized data source, executing Point-in-Polygon mathematical algorithms for geofencing boundaries, managing student and faculty data, and storing dynamic campus zones.
2. **React Native Mobile App**: A cross-platform mobile application capturing foreground and background GPS coordinates, fetching attendance logs, and accessing course material notes.
3. **React/Vite Admin Dashboard**: A real-time web portal for administrators utilizing `react-leaflet` to map institutional geographic zones and track the active location of the student body.

---

## ✨ Key Features

- **Geometric Campus Validation**: Students can *only* log in if their GPS coordinates fall strictly inside the physical campus boundaries.
- **Background Fleet Tracking**: Once authenticated, the mobile app regularly tracks coordinates to build a comprehensive movement topology.
- **Interactive OpenStreetMap Control Panel**: The React Admin panel plots a live GeoJSON-like feed of active users and multi-zone bounding polygons.
- **Subject-Wise Attendance Subsystem**: Distinct from location data, precise class attendance logs can be tracked and visualized independently.
- **Academic Note Repository**: Students can fetch and download PDFs/links natively inside their devices.

---

## 🗺 Geofencing Mechanism
To bypass the complex installation of `GeoDjango` and `PostGIS` on local deployments, this MVP employs a **Ray-Casting algorithm** executed dynamically in standard Python. Coordinate streams injected from Expo's Location APIs are validated linearly against the complex bounding `CampusZone` polygons directly on the HTTP socket runtime.

---

## 📂 Project Structure

```text
d:\REC-attendance-system
├── backend/                  # Python/Django API Monolith
│   ├── api/                  # Core App (Models, Views, Serializers)
│   ├── config/               # Settings & Entry Points
│   └── populate_db.py        # Database Seed Script
├── mobile/                   # React Native (Expo) Root
│   ├── screens/              # Core UI Layouts (Login, Maps, Notes, Attendance)
│   └── App.js                # Top-level Stack & Tab Navigators
└── admin-dashboard/          # React + Vite Management Portal
    ├── src/                  # React Leaflet Integration and Polling Architecture
    └── index.html            # Vite Entry Point
```

---

## 🛠 Prerequisites

Ensure your development environment contains the following:
- **Node.js**: `v18.x` or higher
- **Python**: `3.10` or higher
- **PostgreSQL**: `v13+` running locally on port `5433`
- **Expo CLI**: Mobile rapid development framework

---

## 🚀 Getting Started

To run the complete system, it's recommended to open a separate terminal window for each of the following components.

### 1. Face Recognition Backend (Flask Model)
This handles the face registration, liveness detection, and attendance tracking AI.
```bash
cd Model
python app.py
```
*(Runs the face tracking API, typically on port 5000)*

### 2. Core Backend Setup (Django)
This manages the primary Postgres database, users, and routing.
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python.exe -m pip install --upgrade pip
python manage.py migrate
python populate_db.py          # Seeds the precise campus boundary coordinates
python manage.py runserver 0.0.0.0:8000
```

### 3. Teacher App (React Native + Expo)
The mobile app specifically for staff to register new students and capture multi-pose face embeddings.
```bash
cd teacher-app
npm install
npx expo start
```

### 4. Admin Dashboard (React + Vite)
```bash
cd admin-dashboard
npm install
npm run dev
```
Navigate to `http://localhost:5173` to view the comprehensive map interface.

### 5. Student Mobile Application (React Native + Expo)
```bash
cd mobile
npm install
npx expo start
```
*Note: To test via a physical device using Expo Go across your LAN, update `API_URL` inside `config.js` or `App.js` to mirror your computer's local IPv4 address (e.g., `http://192.168.1.50:8000/api`).*

---

## 🌐 API Overview

| Endpoint | Method | Functionality |
|----------|--------|---------------|
| `/api/auth/login/` | `POST` | Authenticates User & Validates Geofence |
| `/api/location/update/`| `POST` | Dispatches background GPS payload |
| `/api/zones/` | `GET` | Retrieve defined geographic polygons |
| `/api/locations/` | `GET` | Streams latest active student topological data |
| `/api/attendance/` | `GET` | Fetches discrete session attendance |
| `/api/notes/` | `GET` | Fetches academic class material payloads |

---

<p align="center">
  <i>Developed organically with rich aesthetics for scaling educational institutions.</i>
</p>
