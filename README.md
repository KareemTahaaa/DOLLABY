# Dollaby — AI-Powered Fashion Personal Stylist 👗

A full-stack SaaS platform for intelligent wardrobe management, outfit generation, and virtual try-on using advanced AI and computer vision.

## 🎯 Features

- **Wardrobe Management** — Upload and organize your clothing collection
- **AI Outfit Generation** — Get personalized outfit recommendations based on occasions and preferences
- **Fashion Assistant** — Chat with an AI fashion expert powered by Groq/OpenAI
- **Virtual Try-On** — See how clothes look on you with HR-VITON/IDM-VTON technology
- **Weather Integration** — Smart recommendations based on current weather
- **Calendar Integration** — Match outfits to your schedule and events
- **User Authentication** — Secure JWT-based auth with MongoDB

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Auth**: JWT + Bcrypt
- **AI**: OpenAI API, Groq API, Replicate (VITON models)
- **Server**: Uvicorn with Docker

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: Lucide React
- **State Management**: React Context API

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Running with Docker

```bash
cd dollaby
docker-compose up
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📋 Project Structure

```
dollaby/
├── backend/
│   ├── main.py                 # FastAPI application entry
│   ├── auth.py                 # Authentication & JWT
│   ├── closet.py               # Wardrobe management
│   ├── outfit_generator.py     # AI outfit recommendations
│   ├── assistant.py            # Fashion assistant chat
│   ├── calendar_routes.py      # Event scheduling
│   ├── weather.py              # Weather integration
│   ├── viton_service.py        # Virtual try-on orchestration
│   ├── models.py               # Pydantic data models
│   ├── database.py             # MongoDB connection
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Backend container config
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages & layouts
│   │   ├── components/         # React components
│   │   └── middleware.ts       # Auth middleware
│   ├── package.json            # Node dependencies
│   ├── next.config.ts          # Next.js configuration
│   ├── tsconfig.json           # TypeScript config
│   └── Dockerfile              # Frontend container config
│
├── docker-compose.yml          # Multi-container orchestration
└── README.md                   # This file
```

## 🔑 Environment Setup

See [.env.example](./backend/.env.example) for required environment variables:

**Essential Variables:**
- `DATABASE_URL` — MongoDB Atlas connection string
- `OPENAI_API_KEY` — OpenAI API key (for fashion assistant)
- `GROQ_API_KEY` — Groq API key (faster LLM inference)
- `VITON_MODE` — Virtual try-on mode: `huggingface`, `replicate`, or `local`

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Routes & Endpoints](./API_ROUTES.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

### Code Quality
```bash
# Backend
black backend/
flake8 backend/

# Frontend
npm run lint
```

## 🚢 Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick Docker build:
```bash
docker-compose -f docker-compose.yml build
docker-compose up -d
```

## 🔒 Security

- API keys should **never** be committed — use environment variables
- MongoDB Atlas network access must be configured appropriately
- JWT tokens use HS256 algorithm with secure secrets
- All API endpoints require CORS validation
- Password hashing uses bcrypt with salt rounds

## 📝 License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting pull requests.

## 📧 Support

For issues and feature requests, please open an issue on GitHub.

---

**Built with ❤️ for fashion lovers and tech enthusiasts**
