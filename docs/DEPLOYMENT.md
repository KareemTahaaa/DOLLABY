# Deployment Guide

Complete instructions for deploying Dollaby to production.

## 📋 Prerequisites

- Docker Engine (20.10+) and Docker Compose (2.0+)
- Ubuntu 20.04 LTS or similar Linux server
- Domain name and SSL certificate
- MongoDB Atlas account (or self-managed MongoDB)
- API keys for: OpenAI, Groq, Replicate (optional)

## 🏗️ Infrastructure Setup

### Option 1: Docker Compose (Recommended for Single Server)

#### 1. Server Preparation

```bash
# SSH into your server
ssh user@your-server.com

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### 2. Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/your-org/dollaby.git
cd dollaby

# Create production .env file
sudo cp backend/.env.example backend/.env
sudo nano backend/.env  # Edit with production values

# Start services
sudo docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 3. Verify Deployment

```bash
# Test backend
curl http://localhost:8000/

# Test frontend
curl http://localhost:3000/

# Check running containers
docker-compose ps
```

### Option 2: Kubernetes (For Scaling)

#### 1. Prerequisites

- Kubernetes cluster (EKS, AKS, GKE, or self-hosted)
- `kubectl` installed and configured
- Docker images pushed to registry

#### 2. Build and Push Images

```bash
# Tag images
docker tag dollaby-backend your-registry/dollaby-backend:v2.0.0
docker tag dollaby-frontend your-registry/dollaby-frontend:v2.0.0

# Push to registry
docker push your-registry/dollaby-backend:v2.0.0
docker push your-registry/dollaby-frontend:v2.0.0
```

#### 3. Deploy to Kubernetes

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dollaby-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dollaby-backend
  template:
    metadata:
      labels:
        app: dollaby-backend
    spec:
      containers:
      - name: backend
        image: your-registry/dollaby-backend:v2.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dollaby-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: dollaby-secrets
              key: openai-key
        # Add other environment variables
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: dollaby-backend-service
spec:
  type: LoadBalancer
  selector:
    app: dollaby-backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
```

Deploy:
```bash
# Create secrets
kubectl create secret generic dollaby-secrets \
  --from-literal=database-url="mongodb+srv://..." \
  --from-literal=openai-key="sk-..."

# Apply deployment
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get deployments
kubectl get services
```

## 🔐 Production Hardening

### 1. Environment Variables

**Ensure these are set in production:**

```bash
# .env production
ENVIRONMENT=production
JWT_SECRET_KEY="use-strong-random-key"
CORS_ORIGINS="https://yourdomain.com"
```

### 2. Database Security

**MongoDB Atlas Configuration:**
- Enable IP whitelist (not 0.0.0.0/0)
- Use strong credentials
- Enable backups
- Consider multi-region replicas

```bash
# Test connection
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/"
```

### 3. SSL/TLS Certificate

**Using Let's Encrypt with Certbot:**

```bash
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 4. Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/dollaby`:

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;  # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Static uploads
    location /uploads {
        proxy_pass http://backend;
        proxy_cache_valid 200 30d;
        expires 30d;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/dollaby /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 5. Firewall Configuration

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 📊 Monitoring & Logging

### Docker Logs

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Clear old logs
docker system prune
```

### Health Checks

Add to docker-compose.yml:

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

### Uptime Monitoring

Use services like:
- **UptimeRobot**: Free uptime monitoring
- **Grafana + Prometheus**: Advanced metrics
- **Datadog**: Enterprise monitoring

## 🚀 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker images
        run: docker-compose build
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag dollaby-backend:latest ${{ secrets.DOCKER_USERNAME }}/dollaby-backend:${{ github.sha }}
          docker push ${{ secrets.DOCKER_USERNAME }}/dollaby-backend:${{ github.sha }}
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/dollaby
            docker-compose pull
            docker-compose up -d
```

## 📈 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer** (HAProxy or cloud provider's LB)
   - Distribute traffic across multiple backend instances
   - Session stickiness for authenticated users

2. **Database Replication**
   - MongoDB replica set
   - Read replicas for queries

3. **Caching Layer**
   - Redis for session/token caching
   - CDN for static assets

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement pagination and filtering

## 🔄 Updates & Rollbacks

### Zero-Downtime Deployment

```bash
# Update services one at a time
docker-compose pull backend
docker-compose up -d --no-deps --build backend

# Verify
curl http://localhost:8000/

# Update frontend
docker-compose pull frontend
docker-compose up -d --no-deps --build frontend
```

### Rollback

```bash
# Use previous version
docker-compose up -d --build

# Or manually specify version
docker run -d --name dollaby-backend your-registry/dollaby-backend:v1.9.0
```

## 💾 Backup Strategy

### Database Backups

```bash
# MongoDB Atlas automatic backups (enabled by default)
# Manual backup:
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/dollaby"

# Restore:
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/" ./dump
```

### File Uploads

```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/
```

## 🧪 Testing Production

```bash
# Health check
curl -I https://yourdomain.com

# API endpoint
curl -X GET https://yourdomain.com/api/ -H "Authorization: Bearer TOKEN"

# Load testing
ab -n 1000 -c 10 https://yourdomain.com/
```

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify configuration: Review `.env` and `docker-compose.yml`
3. Test connectivity: `curl`, `telnet`, `nslookup`
4. Check firewall rules

## 📚 Additional Resources

- [Docker Deployment Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Security](https://nginx.org/en/docs/)
- [MongoDB Atlas Security](https://docs.mongodb.com/manual/security/)
- [SSL/TLS Let's Encrypt](https://letsencrypt.org/docs/)

---

**Last Updated:** May 2026
