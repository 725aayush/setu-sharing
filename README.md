# 🔐 Secure File Sharing System (Flask)

A **privacy-first, self-hosted file sharing application** built with Flask that allows users to securely share local directories using **password-protected links and QR codes**, without relying on cloud storage or databases.

---

## 📌 Project Overview

This project enables secure file sharing directly from a trusted machine (local PC or server).  
Instead of uploading files to third-party cloud services, files remain on the host system and are shared temporarily through authenticated sessions.

### Key Highlights
- 🔒 Password-protected access
- ⏳ Time-based share expiry
- 📁 Folder-based sharing (not individual uploads only)
- 📷 QR code generation for quick access
- 📦 On-the-fly ZIP archive downloads
- 🚫 No database, no cloud storage
- 🏠 Designed for LAN, intranet, or self-hosted servers

---

## 🛠️ Technologies Used

### Backend
- **Python**
- **Flask**
- **Flask-CORS**
- **Werkzeug**
- **QRCode**

### Frontend
- **React**
- **Vite**
- **Axios**
- **Modern CSS**

### Concepts & Tools
- Session-based authentication
- Secure filesystem access
- In-memory data handling
- RESTful APIs
- QR-based sharing
- ZIP streaming

---

## 🧠 System Design Philosophy

- Files are **never uploaded to the cloud**
- Metadata is stored **in memory**, not in a database
- Designed to minimize attack surface
- Suitable for privacy-sensitive environments
- Avoids serverless platforms intentionally due to filesystem dependency

---

## 📷 Screenshots

> 📌 Add screenshots in a `screenshots/` folder and reference them below

### 🔹 Share Creation Interface
![Create Share](screenshots/create_share.png)

### 🔹 Password Authentication
![Authentication](screenshots/auth.png)

### 🔹 File Browser & Download
![File List](screenshots/file_list.png)

### 🔹 QR Code for Access
![QR Code](screenshots/qr_code.png)

## How It Works (Flow)
User selects a local directory
Sets a password and expiry time
Application generates a unique token
A shareable link and QR code are created
Receiver authenticates using password
Files can be browsed, previewed, downloaded, or archived
