# IndiVote — Empowering Every Indian Voter 🇮🇳

IndiVote is a comprehensive, full-stack Progressive Web Application (PWA) designed to simplify the democratic process for Indian citizens. It serves as a one-stop portal for election schedules, live news, interactive maps, and voter education, powered by an intelligent AI assistant.

![IndiVote Cover](https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Flag_of_India.svg/2560px-Flag_of_India.svg.png)

## 🌐 Live Application
The application is securely deployed and scales automatically via Google Cloud Run:
**[Access IndiVote Live](https://indivote-875714060802.asia-south1.run.app)**

## ✨ Key Features
- **Interactive Election Map**: Visualizes current and past election data state-by-state using Google GeoCharts.
- **AI Election Assistant**: An integrated conversational agent powered by Gemini AI that answers complex questions regarding voting procedures, timelines, and candidates.
- **Live News Feed**: Automatically aggregates and updates the latest election news.
- **Dynamic Timelines**: Real-time tracking of polling phases and result countdowns.
- **Multilingual Support**: Seamless translation into regional languages via Google Translate integration.
- **Modern UI/UX**: A responsive "Glassmorphism" design with smooth micro-animations optimized for both desktop and mobile devices.

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, CSS Grid/Flexbox), and JavaScript (ES6+).
- **Backend**: Node.js and Express.js.
- **Database**: SQLite3 for persistent, secure local storage of configuration and state data.
- **APIs**: Google Gemini AI (for chatbot), Google GeoCharts (for map data), RSS-to-JSON (for news).
- **Deployment**: Containerized and hosted on Google Cloud Run.

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (Node Package Manager)

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Surya-64/IndiVote.git
   cd IndiVote
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Initialization:**
   Initialize the local SQLite database to seed the map with election data:
   ```bash
   node db_setup.js
   ```

4. **Environment Configuration:**
   Provide your Gemini API key in the application's AI Chat interface upon first launch, or set it securely via the backend API.

5. **Run the server:**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3030/`.

## 🧪 Testing
The application includes an automated test suite verifying core API functionality and security features (e.g., rate limiting).
```bash
npm test
```

## 🔒 Security
- **API Key Protection**: External API keys are stored server-side in a local SQLite database, never exposed to the client browser.
- **Rate Limiting**: Defends against DDoS and abuse on AI interaction endpoints.
- **Content Security Policy (CSP)**: Strict headers mitigate XSS risks.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Surya-64/IndiVote/issues).

## 📄 License
This project is open-source and available for educational and informational purposes.

---
*Developed to foster a more informed and engaged electorate.*