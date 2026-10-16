# BukSU Chatbot - Staff Management Guide

## Overview
This guide helps staff members manage, deploy, and maintain the BukSU Chatbot system in production environments.

## 🚀 Quick Start

### For Development
```bash
# Setup environment
python scripts/setup-env.py

# Start development server
python scripts/start.py --env development
```

### For Production Deployment
```bash
# Create backup and deploy
python scripts/deploy.py production --backup

# Start monitoring
python scripts/monitor.py --daemon
```

## 📁 Project Structure

```
Code-Crafter/
├── rasa/
│   ├── actions/
│   ├── actions.py              # Main action server
│   ├── responses.json           # Original responses
│   └── responses_new.json      # New generalized responses
│   ├── data/
│   │   ├── nlu.yml            # Training data
│   │   └── stories.yml         # Conversation stories
│   ├── domain.yml              # Bot domain
│   └── config.yml              # Rasa configuration
├── config/
│   ├── production.yml           # Production config
│   ├── development.yml          # Development config
│   └── staging.yml             # Staging config
├── scripts/
│   ├── setup-env.py           # Environment setup
│   ├── start.py               # Startup script
│   ├── deploy.py              # Deployment script
│   └── monitor.py             # Monitoring script
├── logs/                     # Application logs
├── uploads/                   # File uploads
├── models/                    # Trained models
└── docker-compose.yml          # Docker configuration
```

## 🔧 Environment Configuration

### Environment Variables
Key environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (dev/staging/prod) | development |
| `PORT` | Server port | 5005 |
| `LOG_LEVEL` | Logging level | INFO |
| `JWT_SECRET` | Security secret | Change in production! |
| `DATABASE_URL` | Database connection | Optional |
| `ENABLE_MONITORING` | Enable monitoring | true |

### Configuration Files
- **Development**: `config/development.yml` - Fast training, debug logging
- **Staging**: `config/staging.yml` - Balanced settings
- **Production**: `config/production.yml` - Optimized for performance

## 🚢 Deployment Process

### Pre-deployment Checklist
- [ ] Update `.env` with production values
- [ ] Test all changes in development
- [ ] Create backup of current data
- [ ] Verify all required files present
- [ ] Check system requirements

### Deployment Steps

1. **Setup Environment**
   ```bash
   python scripts/setup-env.py
   ```

2. **Deploy to Production**
   ```bash
   # With backup (recommended)
   python scripts/deploy.py production --backup
   
   # Without backup
   python scripts/deploy.py production
   ```

3. **Verify Deployment**
   ```bash
   python scripts/monitor.py --status
   ```

### Rollback Process
If deployment fails:
```bash
python scripts/deploy.py --rollback data/backup/deployment_YYYYMMDD_HHMMSS
```

## 📊 Monitoring

### Health Checks
```bash
# Check current status
python scripts/monitor.py --status

# Start continuous monitoring
python scripts/monitor.py --daemon
```

### Metrics Tracked
- Server uptime
- Response times
- Success/error rates
- CPU and memory usage
- Request patterns

### Log Files
- `logs/app.log` - Application logs
- `logs/rasa_production.log` - Rasa logs
- `logs/monitoring.log` - Monitoring logs
- `logs/metrics.json` - Performance metrics

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Start specific environment
docker-compose --profile production up -d

# View logs
docker-compose logs -f rasa

# Stop services
docker-compose down
```

### Container Services
- **rasa**: Main Rasa server
- **rasa-actions**: Action server
- **redis**: Caching (optional)
- **nginx**: Reverse proxy (production only)

## 🔒 Security

### Production Security
1. **Change Default Secrets**
   - Update `JWT_SECRET` in `.env`
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Limit API access

3. **File Permissions**
   - Restrict write access to logs
   - Secure upload directories
   - Use non-root Docker user

### SSL Configuration
For production with nginx:
```bash
# Place SSL certificates in nginx/ssl/
├── ssl/
│   ├── cert.pem
│   └── key.pem
```

## 📝 Content Management

### Adding New Locations
Update `rasa/actions/responses_new.json`:

```json
{
  "locations": {
    "New Location Name": {
      "type": "location_type",
      "building": "Building Name",
      "floor": "Floor",
      "coordinates": [x, y],
      "map_id": "map_identifier",
      "responses": {
        "en": ["English response"],
        "ceb": ["Cebuano response"]
      }
    }
  }
}
```

### Updating NLU Data
Add to `rasa/data/nlu.yml`:
```yaml
- intent: ask_location
  examples: |
    - Where is [New Location](location)?
```

### Training New Model
```bash
# Train with new data
rasa train

# Test before deployment
rasa test
```

## 🛠️ Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check logs
tail -f logs/app.log

# Check port usage
netstat -tulpn | grep :5005

# Kill existing processes
pkill -f rasa
```

#### Model Training Fails
```bash
# Validate NLU data
rasa data validate

# Check domain syntax
rasa data validate domain.yml

# Clear cache
rm -rf models/
```

#### High Memory Usage
```bash
# Check system resources
python scripts/monitor.py --status

# Restart services
docker-compose restart rasa
```

### Getting Help

#### Internal Support
- Check logs in `logs/` directory
- Review monitoring metrics
- Consult this documentation

#### External Resources
- [Rasa Documentation](https://rasa.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Python Logging](https://docs.python.org/3/library/logging.html)

## 📋 Maintenance Schedule

### Daily Tasks
- [ ] Check monitoring alerts
- [ ] Review error logs
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Update location data
- [ ] Review performance metrics
- [ ] Clean old log files

### Monthly Tasks
- [ ] Security audit
- [ ] Update dependencies
- [ ] Test rollback procedures

## 🚨 Emergency Procedures

### Server Down
1. Check monitoring dashboard
2. Review recent logs
3. Attempt restart: `docker-compose restart rasa`
4. If still down, rollback to last backup

### Data Corruption
1. Stop all services
2. Restore from backup: `python scripts/deploy.py --rollback`
3. Verify data integrity
4. Restart services

### Security Incident
1. Change all secrets
2. Review access logs
3. Update firewall rules
4. Notify stakeholders

## 📞 Contact Information

### Development Team
- **Primary**: ICT Services Unit
- **Email**: ict@buksu.edu.ph
- **Location**: Finance Building, 3rd Floor

### Emergency Contacts
- **Server Issues**: System Administrator
- **Security Issues**: Security Team
- **Data Issues**: Database Administrator

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintained by**: BukSU ICT Services Unit
