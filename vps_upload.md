# SKILL: Despliegue de Sistema de Comandas con Docker en VPS

## 1. Conexión al Servidor
Abre tu terminal y conéctate usando tu usuario administrador y la IP de DigitalOcean. Al tener tu llave SSH configurada, entrarás directamente.
`ssh root@159.223.155.188`

## 2. Instalación de Docker, Nginx y Certbot
Actualizamos el sistema e instalamos únicamente Docker (para los contenedores), Nginx (para enrutar el tráfico de tus futuros proyectos) y Certbot (para los certificados SSL).

`apt update && apt upgrade -y`
`apt install -y docker.io docker-compose nginx git curl certbot python3-certbot-nginx`

Habilitamos Docker para que inicie automáticamente si el servidor se reinicia:
`systemctl enable docker`
`systemctl start docker`

## 3. Clonar el Repositorio
Descargamos el código fuente desde GitHub.
https://github.com/VinchitaGamer/comandasapp

`cd /var/www`
`git clone <TU_ENLACE_DE_GITHUB> restaurante-comandas`
`cd restaurante-comandas`

## 4. Archivos de Configuración de Docker
*Nota para el agente/desarrollador: Asegúrate de que estos 3 archivos existan en el repositorio antes de subirlo, o créalos directamente en el servidor.*

### A) Dockerfile para el Backend (/backend/Dockerfile)
Crea este archivo dentro de la carpeta *backend*:
`FROM python:3.10-slim`
`WORKDIR /app`
`COPY requirements.txt .`
`RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn`
`COPY . .`
`CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000"]`

### B) Dockerfile para el Frontend (/frontend/Dockerfile)
Crea este archivo dentro de la carpeta *frontend*:
`FROM node:20-alpine`
`WORKDIR /app`
`COPY package*.json ./`
`RUN npm install`
`COPY . .`
`# Las variables de entorno de Next.js deben estar presentes en el build`
`ARG NEXT_PUBLIC_API_URL`
`ARG NEXT_PUBLIC_WS_URL`
`ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL`
`ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL`
`RUN npm run build`
`CMD ["npm", "start"]`

### C) docker-compose.yml (En la raíz del proyecto)
Crea este archivo en la carpeta principal */var/www/restaurante-comandas*:
`version: '3.8'`

`services:`
`  backend:`
`    build: ./backend`
`    container_name: comandas_backend`
`    restart: always`
`    ports:`
`      - "8000:8000"`
`    environment:`
`      - SECRET_KEY=genera_una_clave_aleatoria_larga_aqui_12345`
`      - CORS_ORIGINS=https://comandas.sourdev.app`
`    volumes:`
`      - ./backend/database.db:/app/database.db`

`  frontend:`
`    build: `
`      context: ./frontend`
`      args:`
`        NEXT_PUBLIC_API_URL: https://comandas.sourdev.app/api`
`        NEXT_PUBLIC_WS_URL: wss://comandas.sourdev.app/ws`
`    container_name: comandas_frontend`
`    restart: always`
`    ports:`
`      - "3000:3000"`
`    depends_on:`
`      - backend`

## 5. Levantar los Contenedores
Con los archivos listos, construimos e iniciamos el sistema en segundo plano.

`cd /var/www/restaurante-comandas`
`docker-compose up -d --build`

*Puedes verificar que ambos contenedores estén corriendo con:* `docker ps`

## 6. Configuración de Nginx (Proxy Inverso)
Ahora configuramos Nginx en el servidor host para que reciba las visitas web y las envíe a los contenedores correctos (Frontend en el puerto 3000, Backend en el puerto 8000).

`nano /etc/nginx/sites-available/comandas`
*(Pega esta configuración)*

`server {`
`    listen 80;`
`    server_name comandas.sourdev.app;`

`    location / {`
`        proxy_pass http://127.0.0.1:3000;`
`        proxy_http_version 1.1;`
`        proxy_set_header Upgrade $http_upgrade;`
`        proxy_set_header Connection 'upgrade';`
`        proxy_set_header Host $host;`
`        proxy_cache_bypass $http_upgrade;`
`    }`

`    location /api/ {`
`        proxy_pass http://127.0.0.1:8000/api/;`
`        proxy_set_header Host $host;`
`        proxy_set_header X-Real-IP $remote_addr;`
`    }`

`    location /ws {`
`        proxy_pass http://127.0.0.1:8000/ws;`
`        proxy_http_version 1.1;`
`        proxy_set_header Upgrade $http_upgrade;`
`        proxy_set_header Connection "Upgrade";`
`        proxy_set_header Host $host;`
`    }`
`}`

Habilita el sitio y reinicia Nginx:
`ln -s /etc/nginx/sites-available/comandas /etc/nginx/sites-enabled/`
`nginx -t`
`systemctl restart nginx`

## 7. Generar Certificado SSL (HTTPS y WSS)
Finalmente, protegemos la conexión con encriptación.
`certbot --nginx -d comandas.sourdev.app`
*(Sigue las instrucciones en pantalla, ingresa tu correo y acepta los términos. Selecciona la opción para redirigir todo el tráfico a HTTPS si te lo pregunta).*