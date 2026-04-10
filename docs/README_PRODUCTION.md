# BukSU Chatbot - Production Ready System

A comprehensive, production-ready chatbot system for Bukidnon State University built with Rasa framework, featuring generalized entity handling with metadata support.

## 🚀 Features

- **🤖 Intelligent Conversational AI**: Built with Rasa framework
- **🌍 Bilingual Support**: English and Cebuano language support
- **📍 Generalized Location Entity**: Single entity handling multiple location types
- **📊 Rich Metadata**: Building, floor, coordinates, and map integration
- **🐳 Docker Ready**: Containerized deployment with Docker Compose
- **📈 Production Monitoring**: Comprehensive health checks and metrics
- **🔒 Security Focused**: Environment-based configuration management
- **🛠️ Staff Tools**: Complete deployment and management scripts

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend    │    │   Rasa Core   │    │   Actions      │
│   (Web UI)   │◄──►│   (NLU + Dialog)│◄──►│   (Business    │
└─────────────────┘    └─────────────────┘    │    Logic)       │
                                              └─────────────────┘
```

## 📁 Project Structure

```
Chatbot-v4-BUKSU/
├── 📋 rasa/                    # Core Rasa application
│   ├── 🤖 actions/           # Custom actions
│   │   ├── actions.py         # Main action server
│   │   └── responses_location.json # Location response data
│   ├── 📊 data/              # Training data
│   │   ├── nlu.yml           # NLU training
│   │   └── stories.yml        # Dialog stories
│   ├── 🏷️ domain.yml          # Bot domain
│   ├── ⚙️ config.yml          # Rasa config
│   ├── ⚙️ endpoints.yml       # Action server endpoints
│   └── 🧪 venv/             # Python virtual environment
├── 🌐 client/                 # React frontend
│   ├── 📁 src/              # Source code
│   ├── 📦 package.json       # Dependencies
│   └── � vite.config.ts     # Build config
├── �️ server/                 # Node.js backend
│   ├── 🔧 controllers/       # API controllers
│   ├── �️ routes.ts          # API routes
│   └── � drizzle.config.ts  # Database config
├── ⚙️ config/                  # Environment configs
├── 📜 scripts/                 # Management scripts
├── 📝 docs/                    # Documentation
├── 🐳 docker-compose.yml         # Container orchestration
├── 🐳 Dockerfile               # Container definition
├── 📊 logs/                    # Application logs
├── 📁 uploads/                  # File uploads
├── 💾 models/                   # Trained models
├── 🔑 .env.example              # Environment template
├── 📋 package.json              # Node dependencies
├── 🎨 components.json           # UI components
├── 🗒️ tsconfig.json            # TypeScript config
└── 🌐 rulebaseTranslation/      # Translation system
```

## 🚀 Quick Start

### For Development Team
```bash
# 1. Clone and setup
git clone <repository-url>
cd Code-Crafter
python scripts/setup-env.py

# 2. Start development
python scripts/start.py --env development

# 3. Train model (if needed)
rasa train
```

### For Production Deployment
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with production values

# 2. Deploy with backup
python scripts/deploy.py production --backup

# 3. Start monitoring
python scripts/monitor.py --daemon
```

### PostgreSQL (current limited usage)

The project is wired to use **PostgreSQL** in a minimal, production-ready way while keeping `rasa/actions/responses.json` as the primary source during development.

- PostgreSQL connection is configured via these env vars in `.env`:

  ```ini
  PGHOST=localhost
  PGPORT=5432
  PGUSER=postgres
  PGPASSWORD=adpass           # change as needed on your server
  PGDATABASE=ChatbotVersion
  ```

- A single intent, `exam_requirements`, is migrated into a `responses` table and served from PostgreSQL **only when the Rasa API is unavailable**.

To migrate that intent from `rasa/actions/responses.json` into PostgreSQL:

```bash
# From project root, after setting .env
npx tsx scripts/migrate-exam-requirements-to-pg.ts
```

This script:

- Creates the `responses` table if it does not exist.
- Upserts only the `exam_requirements` intent into PostgreSQL.
- Leaves all other intents in `responses.json`.

At runtime, when the backend cannot reach Rasa and the user message text is exactly `exam_requirements`, the server will:

- First try to read `exam_requirements` from PostgreSQL.
- If that fails, fall back to the file-based `responses.json` as before.

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# Production with nginx
docker-compose --profile production up -d
```

## 🌐 Environment Configuration

### Development Environment
- **Purpose**: Active development and testing
- **Config**: `config/development.yml`
- **Logging**: DEBUG level
- **Features**: Telemetry enabled, fast training

### Staging Environment
- **Purpose**: Pre-production testing
- **Config**: `config/staging.yml`
- **Logging**: INFO level
- **Features**: Production-like settings

### Production Environment
- **Purpose**: Live deployment
- **Config**: `config/production.yml`
- **Logging**: INFO level
- **Features**: Optimized for performance, monitoring enabled

## 📍 Generalized Entity System

The chatbot features a revolutionary generalized location entity that handles multiple location types through a single unified system:

### Supported Location Types
- **🖥️ Computer Laboratories** (ComLab 1-8)
- **🏢 Faculty Rooms** (Faculty Room 102)
- **🚻 Comfort Rooms** (Comfort Room - Finance 3F)
- **🏫 Classrooms** (Classroom 204)
- **📍 Any Future Location Types**

### Entity Structure
```json
{
  "location_name": {
    "type": "location_category",
    "building": "Building Name",
    "floor": "Floor Level",
    "coordinates": [x, y],
    "map_id": "map_identifier",
    "responses": {
      "en": ["English responses"],
      "ceb": ["Cebuano responses"]
    }
  }
}
```

### Usage Examples
- "Where is [ComLab 1](location)?"
- "Can you help me find [Faculty Room 102](location)?"
- "Asa dapit ang [Classroom 204](location)?"

## 🔧 Management Scripts

### Environment Setup (`scripts/setup-env.py`)
- ✅ Creates virtual environment
- ✅ Installs dependencies
- ✅ Validates configuration
- ✅ Creates necessary directories

### Startup Script (`scripts/start.py`)
- 🚀 Environment-aware startup
- 📊 Health checks
- 📝 Comprehensive logging
- 🔄 Graceful shutdown handling

### Deployment Script (`scripts/deploy.py`)
- 📦 Automatic backup creation
- 🧪 Model validation
- 🚀 Multi-environment support
- 🔄 Rollback capabilities
- 📝 Deployment logging

### Monitoring Script (`scripts/monitor.py`)
- 📈 Real-time metrics
- 🚨 Alert system
- 📊 Resource monitoring
- 📝 Historical data tracking

## 🐳 Docker Deployment

### Container Services
- **rasa**: Main Rasa server (port 5005)
- **rasa-actions**: Action server
- **redis**: Caching layer (optional)
- **nginx**: Reverse proxy with SSL (production)

### Docker Commands
```bash
# Development
docker-compose up -d

# Production
docker-compose --profile production up -d

# Scale services
docker-compose up -d --scale rasa=2

# View logs
docker-compose logs -f
```

## 💬 Embeddable Chatbox Widget

The end-user chat UI has a dedicated, minimal page that is **ready for embedding** into other systems.

### Embed URL

- Frontend chat widget page (production): `https://<your-domain>/embed/chat`
- During local development with Vite: `http://localhost:5000/embed/chat`

### How to embed via iframe

In any external system (portal, LMS, other apps), you can embed the chatbot as an iframe:

```html
<iframe
  src="https://your-bot-domain.com/embed/chat"
  style="border:0;width:100%;max-width:420px;height:720px;border-radius:16px;overflow:hidden;"
  allow="microphone;"
></iframe>
```



### How to Run it

To start the entire rasa use this command

```
venv\Scripts\python.exe -m rasa run --enable-api --cors "*"

venv\Scripts\python.exe -m rasa run actions
```

And to kills existing port running use this command

```
taskkill /F /IM python.exe
```

#### Sticky Positioning (Fixed to Parent Page)

If you want the chathead to stick to the bottom right of the parent page (like the main site), even when scrolling, add `position: fixed` to the iframe's style:

```html
<iframe
  src="https://your-bot-domain.com/embed/chat"
  style="position:fixed;bottom:0;right:0;z-index:9999;border:0;width:420px;height:720px;border-radius:16px;overflow:hidden;background:transparent;pointer-events:auto;"
  allow="microphone;"
></iframe>
```

For responsive design on mobile devices (e.g., iPhone SE), adjust the size to avoid covering navigation:

```html
<style>
  @media (max-width: 480px) {
    iframe {
      width: 100% !important;
      height: 80vh !important;
      max-width: 100vw !important;
    }
  }
</style>
<iframe
  src="https://your-bot-domain.com/embed/chat"
  style="position:fixed;bottom:0;right:0;z-index:9999;border:0;width:420px;height:720px;border-radius:16px;overflow:hidden;background:transparent;pointer-events:auto;"
  allow="microphone;"
></iframe>
```

This positions the iframe fixed to the parent's viewport, making the chathead behave as a floating widget on the parent page. On small screens, it resizes to fit better without covering the nav bar.

Notes:

- The `/embed/chat` page renders only the chat window in a centered container.
- The main marketing/landing layout (`/`) is **not** included in this view.
- Voice input (microphone) will work if the embedding site allows the `microphone` permission.

### Running the embeddable chat in development

```bash
# 1. Start backend API
npm run dev            # starts the Express + Rasa proxy

# 2. Start frontend
npm run dev:client     # Vite dev server on http://localhost:5000

# 3. Open or embed
#   Direct: http://localhost:5000/embed/chat
#   Iframe: use the same URL as src in another local app
```

## 📊 Monitoring & Analytics

### Health Metrics
- Server uptime and availability
- Response time tracking
- Success/error rates
- System resource usage
- Request patterns

### Alert System
- CPU usage thresholds
- Memory usage alerts
- Custom webhook integration
- Email notification support

### Log Management
- Automatic log rotation
- Configurable retention
- Structured logging format
- Real-time log streaming

## 🔒 Security Features

### Environment Security
- `.env` file for sensitive data
- JWT secret management
- CORS configuration
- Rate limiting support

### Production Security
- Non-root Docker containers
- SSL/TLS encryption
- Firewall configuration
- Security headers

## 🛠️ Development Workflow

### 1. Feature Development
```bash
# Create new feature branch
git checkout -b new-feature

# Make changes
# Edit files in rasa/ directory

# Test locally
python scripts/start.py --env development
```

### 2. Testing
```bash
# Train model
rasa train

# Run tests
rasa test

# Interactive testing
rasa shell
```

### 3. Deployment
```bash
# Deploy to staging
python scripts/deploy.py staging --backup

# Test staging environment
# Manual testing and validation

# Deploy to production
python scripts/deploy.py production --backup
```

## 📋 Requirements

### System Requirements
- **Python**: 3.9+
- **Memory**: 2GB+ RAM
- **Storage**: 5GB+ available
- **Network**: Internet connection for training

### Dependencies
See `requirements.txt` for complete list:
- `rasa>=3.6.0`
- `flask>=2.3.0`
- `psutil>=5.9.0`
- `requests>=2.28.0`

## 📞 Support & Documentation

### Documentation
- 📖 **Staff Guide**: `docs/STAFF_GUIDE.md`
- 🔧 **API Documentation**: Available in Rasa docs
- 🐳 **Docker Guide**: Container deployment instructions

### Getting Help
1. **Check Logs**: Review `logs/` directory first
2. **Staff Guide**: Consult `docs/STAFF_GUIDE.md`
3. **Monitoring**: Use `scripts/monitor.py --status`
4. **Community**: Rasa community forums

### Emergency Procedures
- 🚨 **Server Down**: Use rollback procedures
- 🗑️ **Data Loss**: Restore from backups
- 🔒 **Security**: Change all secrets

## 🎯 Production Readiness Checklist

### Pre-Deployment
- [ ] Environment configured in `.env`
- [ ] All secrets changed from defaults
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] Performance tested under load

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team trained on procedures

---

## 🏆 Key Benefits

### For Development Team
- **🚀 Fast Setup**: One-command environment setup
- **🔧 Unified Management**: Single script for all operations
- **📊 Real-time Monitoring**: Comprehensive health tracking
- **🔄 Safe Deployments**: Backup and rollback capabilities
- **🐳 Portable**: Docker-based deployment

### For University Staff
- **📚 Easy Management**: Comprehensive staff guide
- **🛠️ Low Maintenance**: Automated monitoring and alerts
- **🔒 Secure**: Production-focused security
- **📈 Scalable**: Docker orchestration support
- **🌍 Bilingual**: Native language support

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Framework**: Rasa 3.1  
**Maintained by**: BukSU ICT Services Unit

🚀 **Ready for production deployment!**
