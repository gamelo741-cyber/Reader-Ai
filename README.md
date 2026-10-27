# Reader AI 📚

Reader AI is a reading assistant designed to help readers organise their books and track their reading progress.

## Features

- Add books with their titles and authors.
- Browse and search books by title or author.
- Track reading progress from 0% to 100%.
- Save books and reading progress in an SQLite database.
- Connect a React frontend to a FastAPI backend.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Python
- FastAPI
- SQLModel
- SQLite for local development; PostgreSQL can be selected with `DATABASE_URL`

## Project Structure

```text
reader-ai/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd reader-ai
```

Replace `YOUR_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Set up the backend

Open a terminal in the `backend` folder.

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the required packages:

```powershell
python -m pip install -r requirements.txt
```

Start the backend server:

```powershell
python -m uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

Explore the API documentation at `http://127.0.0.1:8000/docs`.

### 3. Set up the frontend

Open another terminal in the `frontend` folder.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in your terminal, usually `http://localhost:5173`.

## Database

For local development, Reader AI uses SQLite by default. Start the backend from the `backend` directory and leave `DATABASE_URL` unset; the database file is `backend/reader_ai.db`.

To use PostgreSQL later, configure `DATABASE_URL` in the hosting service's environment settings. Standard `postgres://` and `postgresql://` URLs are configured to use the psycopg 3 SQLAlchemy driver. Do not commit the URL or print it in logs; it contains database credentials. The root `.gitignore` excludes local `.env` files.

The backend allows the local frontend origins by default. Set `CORS_ORIGINS` to a comma-separated list of explicit frontend origins when deploying, for example the Cloudflare Pages origin selected for this project. Do not use `*` or add a production origin until it is known.

The local database at `backend/reader_ai.db` is excluded from Git so existing local data is not published with the source code. Before deploying, choose a free hosting option with persistent storage; some free hosts discard files such as SQLite databases when an instance restarts.

## Current Status

The current MVP supports book management, search, reading progress updates, and persistent storage.

## Future Improvements

- AI-powered reading assistance.
- Notes and summaries.
- Flashcards and quizzes.
- Deployment for public access.

## Author

Developed as a personal learning project to practise frontend development, backend APIs, and database integration.
