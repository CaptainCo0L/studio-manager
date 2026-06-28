# Single image: build the React bundle, then serve it from FastAPI (uvicorn).
# Stage 1 — build the frontend.
FROM node:22-alpine AS build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2 — backend + the built SPA copied into app/static.
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=build /fe/dist ./app/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
