# 🚀 Acaris Backend System with CI/CD Pipeline
## 📌 Overview
Acaris is a backend system designed to manage academic consultation processes between students and lecturers.
This project implements a **cloud-native microservices architecture** integrated with a **CI/CD pipeline** to improve system scalability, reliability, and deployment efficiency.

The system is deployed using **Google Cloud Run** and utilizes **Docker containerization** with automated workflows via **GitHub Actions**.

---

## 🎯 Objectives
* Implement a backend system using microservices architecture
* Automate build, testing, and deployment using CI/CD
* Evaluate system performance using DORA metrics
* Ensure system reliability through comprehensive testing

---

## 🏗️ System Architecture
### Architecture Style:
* Microservices
* REST API
* Cloud-native deployment

### Main Services:
* **Auth Service** → Authentication & authorization
* **Acaris Service** → Core academic features
* **Chatbot Service** → Automated assistance

---

## ⚙️ Tech Stack
### Backend
* Node.js
* Express.js

### DevOps
* Docker
* GitHub Actions (CI/CD)

### Cloud
* Google Cloud Run

### Database
* (Relational / NoSQL depending on implementation)

### Authentication
* Firebase Authentication

---

## 📁 Project Structure
```id="tree-structure"
src/
├── config/
├── controllers/
├── services/
├── repositories/
├── models/
├── routes/
├── middlewares/
├── utils/
├── validations/
├── constants/
└── app.js
/docs
/docker
/tests
/.github/workflows
```

---

## 🔄 CI/CD Pipeline
The CI/CD pipeline is implemented using GitHub Actions and includes:
```id="pipeline-flow"
1. Code Push (GitHub)
2. Build Process
3. Automated Testing
4. Docker Image Build
5. Push to Container Registry
6. Deploy to Google Cloud Run
```

### Benefits:
* Faster deployment cycles
* Reduced manual errors
* Continuous integration and delivery

---

## 🐳 Containerization
Each service is containerized using Docker:
```id="docker-commands"
docker build -t service-name .
docker run -p 3000:3000 service-name
```

---

## ☁️ Deployment
Deployment is handled via Google Cloud Run:
```id="deployment-flow"
GitHub → GitHub Actions → Docker Image → Cloud Run
```

### Features:
* Scalable
* Serverless
* Fully managed

---

## 🔌 API Endpoints
### Authentication
```id="auth-endpoints"
POST /auth/register
POST /auth/login
```

### Core Features
```id="core-endpoints"
GET /schedules
POST /booking
GET /documents
```

### Chatbot
```id="chatbot-endpoints"
POST /chatbot
```

---

## 🧪 Testing Strategy
### 1. Functional Testing
* Validate all API endpoints
* Ensure correct response and status codes

### 2. Integration Testing
* Validate interaction between services

### 3. Regression Testing
* Ensure existing features remain stable after updates

### 4. Performance Testing
* Tool: Apache JMeter
* Scenarios:
  * 50 users
  * 100 users

* Metrics:
  * Response Time
  * Throughput
  * Error Rate

### 5. CI/CD Pipeline Testing
* Pipeline duration
* Success/failure rate
* Deployment frequency

---

## 📊 Performance Evaluation (DORA Metrics)

### Deployment Frequency
$$
Deployment\ Frequency = \frac{|D|}{t_n - t_0}
$$

### Lead Time for Changes
$$
Lead\ Time = \frac{1}{n} \sum (t_{deploy} - t_{commit})
$$

### Change Failure Rate
$$
CFR = \frac{D_f}{D} \times 100%
$$

### Mean Time to Recovery (MTTR)
$$
MTTR = \frac{1}{n} \sum (t_{recovery} - t_{failure})
$$

### Pipeline Success Rate
$$
Success\ Rate = \frac{D_s}{D} \times 100%
$$

---

## ✅ Expected Outcomes
* Fully functional backend system
* Automated CI/CD pipeline
* Cloud-deployed microservices
* Comprehensive testing results
* Performance evaluation using DORA metrics

---

## 📌 Development Workflow
```id="workflow"
1. Local Development
2. API Testing (Postman)
3. Dockerization
4. Manual Deployment
5. CI/CD Implementation
6. Automated Testing
7. Data Collection & Evaluation
```

---

## 👨‍💻 Author
* Name: M. Arifin Syam
* Program: Informatics Engineering
* Project: Thesis Implementation (CI/CD Microservices System)

---

## 📄 License
This project is developed for academic purposes.
