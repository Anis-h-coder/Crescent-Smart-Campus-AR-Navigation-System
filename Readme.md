# CrescentPath — Crescent Smart Campus AR Navigation System

A mobile-first Progressive Web Application that helps students and visitors navigate B. S. Abdur Rahman Crescent Institute of Science & Technology using Augmented Reality, AI-powered building recognition, real-time crowd prediction, and an intelligent chatbot.

---

## Live Demo

- Frontend: [admirable-kheer-2e630e.netlify.app](#)

---

## Features

- **AR Navigation** — Real-time directional overlays via camera
- **A* Pathfinding** — Shortest route calculation between campus locations
- **CNN Building Recognition** — Identifies campus buildings from camera input
- **KNN Crowd Prediction** — Predicts crowd levels based on real timetable data
- **LLaMA 3.3 Chatbot** — Groq-powered chatbot for campus queries
- **Voice Guidance** — Step-by-step audio directions
- **Real-time ETA** — Live estimated arrival time using GPS
- **Admin Dashboard** — Manage events, labs, workshops, and staff
- **Student Portal** — Login, profile, dashboard, and classroom details
- **Firebase Integration** — Real-time data sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| AR | AR.js |
| Maps | Leaflet.js |
| Backend | Python, Flask |
| AI/ML | TensorFlow/Keras (CNN), Scikit-learn (KNN) |
| LLM | Groq API — LLaMA 3.3 70B |
| Database | Firebase Realtime Database |
| Deployment | Netlify (frontend), Replit (backend) |

---

## Project Structure

```
CRESCENT SMART CAMPUS NAVIGATION SYSTEM/
├── assets/
│   ├── cres-logo1.png
│   └── crescent-logo.png
│
├── backend/
│   ├── dataset/
│   │   ├── Computer_Science_Block/
│   │   ├── Convocation_Centre/
│   │   ├── Electrical_Science_Block/
│   │   ├── Main_Gate/
│   │   └── Mechanical_Science_Block/
│   ├── app.py
│   ├── campus_qa.json
│   ├── landmark_model.h5
│   └── train_model.py
│
├── data/
│   ├── campusGraph.json
│   └── locations.json
│
├── js/
│   ├── ar.js
│   ├── confirm.js
│   ├── destinations.js
│   ├── firebase.js
│   └── landmark.js
│
├── style/
│
├── admin-dashboard.html
├── admin-events.html
├── admin-labs.html
├── admin-login.html
├── admin-staff.html
├── admin-workshops.html
├── ar.html
├── building-info.html
├── campus-navigation.html
├── chatbot.html
├── classroom-detail.html
├── classrooms.html
├── confirm.html
├── dashboard.html
├── destinations.html
├── emergency.html
├── event-detail.html
├── events.html
├── features.html
├── index.html
├── lab-detail.html
├── labs.html
├── landmark.html
├── live-status.html
├── quick-navigation.html
├── settings.html
├── smart-search.html
├── staff-departments.html
├── staff-detail.html
├── staff-list.html
├── student-dashboard.html
├── student-login.html
├── student-profile.html
├── workshop-detail.html
├── workshops.html
├── netlify.toml
└── requirements.txt
```

---

## Getting Started

### Prerequisites

- Python 3.9 or above
- Groq API key — [get one here](https://console.groq.com)
- Firebase project — [set up here](https://firebase.google.com)

### 1. Clone the repository

```bash
git clone https://github.com/Anis-h-coder/crescentpath.git
cd crescentpath
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```
GROQ_API_KEY=your_groq_api_key_here
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_PROJECT_ID=your_project_id
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the backend

```bash
cd backend
python app.py
```

### 5. Open the frontend

Open `index.html` in your browser or deploy to Netlify.

---

## ML Models

### CNN — Building Recognition
- Trained on campus building images from 5 locations
- Classifies: Computer Science Block, Convocation Centre, Electrical Science Block, Main Gate, Mechanical Science Block
- Model file: `backend/landmark_model.h5`
- Built with TensorFlow/Keras

### KNN — Crowd Prediction
- Trained on actual campus timetable data
- Predicts crowd level (Low / Medium / High) by location and time
- Built with Scikit-learn

---

## Screenshots

> Add screenshots here after uploading

---

## Results

- ~90% route accuracy
- 30% reduction in average navigation time
- Real-time ETA with live GPS tracking

---

## Author

**Anish Fathima N**
B.Tech — Artificial Intelligence & Data Science
B. S. Abdur Rahman Crescent Institute of Science & Technology, Chennai

- GitHub: [github.com/Anis-h-coder](https://github.com/Anis-h-coder)
- LinkedIn: [linkedin.com/in/anish-fathima-425340300](https://linkedin.com/in/anish-fathima-425340300)
- Email: fanish050@gmail.com

---

## License

This project is for academic purposes. All rights reserved.
