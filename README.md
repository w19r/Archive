<div align="center">

# 🕊️ Alaydi Family Digital Archive

**An interactive digital memorial platform preserving the biographies, rare photographs, and memories of the Alaydi family martyrs across generations.**

[![Live Site](https://img.shields.io/badge/Live-archive.abdallahalaydi.com-8A6741?style=flat-square)](https://archive.abdallahalaydi.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![Cloudflare](https://img.shields.io/badge/Edge-Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)](#)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square)](#)

[Main Archive](https://archive.abdallahalaydi.com/) · [Mohammed Alaydi](https://archive.abdallahalaydi.com/mohammed/) · [Abdulmajeed Alaydi](https://archive.abdallahalaydi.com/abdulmajeed/)

</div>

---

## Overview

Created as a personal engineering initiative to preserve the life stories and archival photographs of **Mohammed Alaydi** (1980 – 2025) and **Abdulmajeed Alaydi** (1978 – 2014). The system combines edge-cached static delivery with a hardened full-stack backend for real-time community interaction and automated mobile publishing.

## System Architecture & Engineering Highlights

- **Git-Backed CMS via Telegram Webhook:** A private Telegram bot receives photos and captions, automatically processes three image variants (thumbnail, display, and blur-up placeholder), commits assets via the GitHub REST API, and updates the JSON index with zero manual deployment.
- **Hardened Backend API (FastAPI & PostgreSQL):** Production REST service deployed on Render handling user accounts and live comments, secured with `PBKDF2-HMAC-SHA256` password hashing, `JWT` authentication, disabled production docs, and in-memory sliding-window rate limiting.
- **Zero-Latency UX & Offline PWA:** Client-side `Stale-While-Revalidate` caching for instant comment drawers, a custom chronological parser supporting approximate (`~YYYY`) and range dates, a gesture-enabled pinch-to-zoom lightbox, and automated printable PDF generation.
- **Dynamic Edge Previews & SEO:** Per-memory Open Graph social cards generated dynamically via `Cloudflare Workers`, paired with `Schema.org` (`JSON-LD`) structured data and automated sitemaps.

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), Modular CSS, Service Workers (PWA)
- **Backend & Database:** Python, FastAPI, PostgreSQL
- **Infrastructure & Automation:** Cloudflare (DNS & Workers), GitHub Pages, GitHub REST API, Telegram Bot API

---

<div align="center">
  Built with care and remembrance by <a href="https://abdallahalaydi.com">Abdallah Alaydi</a>
</div>
