# 🚀 HOSTYCARE DEPLOYMENT GUIDE - Real Ested

## Branch: `deployment/hostycare`

This branch contains all files needed to deploy your Real Ested application to Hostycare with automatic CI/CD.

---

## ✅ WHAT'S INCLUDED

✓ `backend/.env.production` - Backend configuration file
✓ `.github/workflows/deploy.yml` - Automated deployment pipeline
✓ `.htaccess` - Frontend routing configuration
✓ `backend/.htaccess` - API proxy configuration
✓ `DEPLOYMENT_GUIDE.md` - This file

---

## 📋 DEPLOYMENT STEPS

### STEP 1: Update Configuration Files

**Edit `backend/.env.production` and fill in your details:**

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost           # Ask Hostycare support
DB_USER=your_mysql_username # From Hostycare panel
DB_PASSWORD=your_password    # From Hostycare panel
DB_NAME=your_database_name   # Your database name
JWT_SECRET=generate-random-string-here
CORS_ORIGIN=https://yourdomain.com
```

**Commit and push:**
```bash
git add backend/.env.production
git commit -m "Update production environment variables"
git push origin deployment/hostycare
```

---

### STEP 2: Add GitHub Secrets

**Go to:** GitHub → Your Repository → Settings → Secrets and variables → Actions

**Click "New repository secret" and add these 3 secrets:**

#### Secret 1: HOSTYCARE_IP
```
Name: HOSTYCARE_IP
Value: [Your Hostycare server IP - from welcome email]
Example: 192.168.1.100
```

#### Secret 2: HOSTYCARE_USERNAME
```
Name: HOSTYCARE_USERNAME
Value: [Your Hostycare FTP/SSH username]
Example: cpanel_username
```

#### Secret 3: HOSTYCARE_PRIVATE_KEY
```
Name: HOSTYCARE_PRIVATE_KEY
Value: [Your SSH private key content]
How to get: Contact Hostycare support or generate in their panel
```

---

### STEP 3: Initial Setup on Hostycare (SSH)

**SSH into Hostycare and run this entire script:**

```bash
#!/bin/bash

echo "🚀 Starting Real Ested Deployment Setup..."

# Step 1: Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Step 2: Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Step 3: Setup directories
echo "Setting up directories..."
cd ~/public_html
mkdir -p real_ested
cd real_ested

# Step 4: Clone repository
echo "Cloning repository..."
git clone https://github.com/Guru1131/real_ested.git . || true
git fetch origin deployment/hostycare:deployment/hostycare
git checkout deployment/hostycare

# Step 5: Setup Backend
echo "Setting up backend..."
cd backend
npm install --production

# Step 6: Setup Frontend
echo "Building frontend..."
cd ../frontend
npm install
npm run build
cp -r dist/* ~/public_html/

# Step 7: Start Backend
echo "Starting backend service..."
cd ../backend
pm2 start server.js --name "real_ested" --watch --env production
pm2 startup
pm2 save

echo "✅ SETUP COMPLETE!"
pm2 status
```

---

### STEP 4: Test Deployment

**SSH into Hostycare and run:**

```bash
# Check backend status
pm2 status

# View logs
pm2 logs real_ested

# Check frontend
curl http://localhost/index.html
```

---

## 🔄 HOW TO DEPLOY UPDATES

### Automatic Deployment (Recommended)

1. Make changes to your code
2. Push to the branch:
```bash
git push origin deployment/hostycare
```
3. **GitHub automatically deploys within 2-3 minutes!** ✅

### Manual Deployment

SSH into Hostycare:

```bash
cd ~/public_html/real_ested
git pull origin deployment/hostycare
cd backend && npm install && pm2 restart real_ested
cd ../frontend && npm install && npm run build && cp -r dist/* ~/public_html/
```

---

## 📊 PM2 COMMANDS

```bash
# Check status
pm2 status

# View live logs
pm2 logs real_ested

# Restart backend
pm2 restart real_ested

# Stop backend
pm2 stop real_ested

# Start backend
pm2 start server.js --name real_ested

# View all services
pm2 list

# Save PM2 config
pm2 save
```

---

## 🐛 TROUBLESHOOTING

### Backend won't start
```bash
cd ~/public_html/real_ested/backend
node server.js
# Check error message
```

### Frontend not showing
```bash
cd ~/public_html/real_ested/frontend
npm run build
cp -r dist/* ~/public_html/
```

### Database connection error
```bash
# Verify credentials in .env.production
cat backend/.env.production

# Test MySQL connection
mysql -u your_user -p your_database
```

### Port 3000 already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### GitHub Actions deployment failed
1. Go to: GitHub → Actions tab
2. Click on the failed workflow
3. Check the error logs
4. Common issues:
   - SSH key not correct
   - Hostycare IP address wrong
   - Username incorrect

---

## 📞 SUPPORT

- **GitHub Actions Logs**: Repository → Actions tab
- **Hostycare SSH Logs**: `pm2 logs real_ested`
- **Hostycare Support**: Contact their support team for server access issues

---

## 🎉 YOU'RE LIVE!

Once deployed:
- Frontend: `https://yourdomain.com`
- Backend API: Running on port 3000
- Auto-restart: Yes (PM2 handles this)
- Auto-deployment: Yes (GitHub Actions)

**Happy deploying!** 🚀