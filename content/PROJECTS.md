# Project Portfolio

These are the projects to feature on the website. Use the first five as the main portfolio; `tyk-automation` may appear as an additional GitHub project but should not outrank the primary five.

## 1. Enterprise Developer Portal Migration Automation

**Positioning:** Flagship project / migration engineering / product thinking  
**Main source:** Private  
**Public PoC:** https://github.com/Ataimo007/edp-migration-poc

### Website title
**Enterprise Developer Portal Migration Automation**

### Summary
Designed and built an end-to-end migration platform for moving Tyk Classic Developer Portal environments to Enterprise Developer Portal (EDP).

Tyk does not ship a built-in Classic-to-EDP migration path that preserves existing developer access. The solution closes that gap by migrating portal resources while preserving existing API keys and user login credentials, avoiding forced key rotation, credential redistribution, and account recreation.

### Core capabilities
- Discovery
- Backup
- Dry-run migration planning
- Migration and reconciliation
- API-key adoption rather than re-minting
- Developer login credential continuity
- Idempotent execution
- Audit trail / ledger
- Rollback
- Controlled cutover
- Delayed decommissioning
- Web wizard and scriptable CLI backed by the same Go migration logic

### Technologies/themes
Go • API Management • REST APIs • Developer Portals • Identity & Credential Migration • Docker • Automation • Data Migration

### Important disclosure
The source repository is private. The website must not link to or imply public availability of the private source. Link to the public PoC only.

---

## 2. Kubernetes CRD Migration Automation

**Repository:** https://github.com/Ataimo007/tyk-crd-migration

### Website title
**Kubernetes CRD Migration Automation**

### Summary
Built a migration utility for automating discovery, backup, transformation and migration of Tyk Operator-managed Custom Resources between Kubernetes environments.

### Core capabilities
- Resource discovery
- CRD backup
- Cluster/context-aware migration
- Operator context transformation
- Validation/reporting
- Cleanup

### Technologies/themes
Kubernetes • Tyk Operator • CRDs • Bash • kubectl • Automation • API Management • Platform Migration

---

## 3. API Route Collision Analyzer

**Repository:** https://github.com/Ataimo007/tyk-dup-listen-path-checker

### Website title
**API Route Collision Analyzer**

### Summary
Python CLI that detects duplicate or potentially conflicting API routes in Tyk by analysing domain and listen-path combinations, turning a recurring troubleshooting scenario into a repeatable diagnostic workflow.

### Core capabilities
- Tyk Dashboard REST API integration
- Domain + listen-path collision analysis
- Strict and broad match modes
- Internal API handling
- Table, JSON and CSV output
- CI-friendly exit codes

### Technologies/themes
Python • REST APIs • API Gateway • API Troubleshooting • Tyk Dashboard API • Automation • CI/CD

---

## 4. Hybrid API Gateway Development Environment

**Repository:** https://github.com/Ataimo007/tyk-hybrid-docker

### Website title
**Hybrid API Gateway Development Environment**

### Summary
A lightweight Docker Compose environment for running and troubleshooting a Tyk Hybrid Gateway and analytics Pump locally with Redis and remote control-plane/MDCB connectivity.

### Technologies/themes
Docker • Docker Compose • Tyk Gateway • Tyk Pump • Redis • Hybrid Architecture • API Gateway • Analytics

---

## 5. API Key Hashing & Diagnostic Utility

**Repository:** https://github.com/Ataimo007/tyk-hashing

### Website title
**API Key Hashing & Diagnostic Utility**

### Summary
Go-based utility for reproducing and inspecting Tyk API-key hashing behaviour for troubleshooting, validation and development use cases.

### Supported algorithms
- SHA-256
- Murmur32
- Murmur64
- Murmur128

### Technologies/themes
Go • API Security • Hashing • MurmurHash • SHA-256 • API Keys • Troubleshooting • Tyk Gateway

---

## Additional project — API Automation Tool

**Repository:** https://github.com/Ataimo007/tyk-automation

Python automation tooling for provisioning and deleting Tyk OAS/JWT APIs using the Dashboard API and generating product-related payloads. Keep this as an additional GitHub project rather than a top-five portfolio card unless it is substantially expanded later.
