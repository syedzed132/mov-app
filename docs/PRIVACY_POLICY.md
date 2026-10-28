# Privacy Policy & Data Rights

**Effective Date:** October 2026  
**Product:** NXT FORM  
**Jurisdiction Compliance:** Canada (Personal Information Protection and Electronic Documents Act — PIPEDA; Quebec Law 25), European Union (GDPR), United States.

---

## 1. Core Commitment & Privacy Principles

NXT FORM is built on a **privacy-first architecture**:
1. **No Data Brokering:** We do not sell, rent, monetize, or share your personal training or dietary records with advertisers, data brokers, or insurance companies.
2. **No Tracking Pixels or Ad SDKs:** The application contains zero advertising SDKs, third-party behavioral trackers, or cross-site fingerprinting scripts.
3. **No Hidden AI Transmission:** Your daily food diaries, workout weights, and body measurements are computed deterministically. They are never sent to third-party artificial intelligence services for core application features.
4. **Complete Data Sovereignty:** You have the absolute right to export your entire history at any time and delete your account permanently with one click.

---

## 2. Information We Collect and Process

We only collect data strictly necessary to provide fitness and nutrition tracking:

| Data Category | Purpose | Storage & Retention |
|---|---|---|
| **Account Credentials** | Email address and hashed password (or WebAuthn passkey public key, or Google OIDC subject token) to authenticate you. | Stored in encrypted database. Passwords are salted and hashed. |
| **Physical Targets** | Height, bodyweight, age, sex/biological profile, activity level, and target goals. | Used solely by the deterministic plan engine to calculate BMR, TDEE, and safe macro targets. |
| **Nutrition Log** | Meal entries, food names, portion sizes, calories, macronutrients, and water intake. | Stored in per-user monthly documents. |
| **Workout Logs** | Exercises, sets, repetitions, weights lifted, cardio duration/speed, and personal records. | Stored in your per-user training state document. |
| **Body Measurements** | Weight check-ins, waist/arm circumference, and optional progress photos. | Stored in your per-user training state and local encrypted media directory. |

---

## 3. Canadian Privacy Law (PIPEDA & Quebec Law 25) Compliance

In accordance with PIPEDA's 10 Fair Information Principles and Quebec Law 25:
- **Accountability:** The data controller maintains strict access controls. Technical safeguards prevent cross-user data access.
- **Limiting Collection:** Only data directly required for training, nutrition, and gamification calculations is collected.
- **Safeguards (Health Data Protection):** Sensitive health measurements are transmitted strictly over TLS 1.3 HTTPS. Application server logs never record health details, body weights, or meal logs.
- **Individual Access (Portability):** You can download your complete data package anytime in both human-readable standard spreadsheet format (CSV) and open machine-readable format (JSON).
- **Right to Erasure (De-indexing and Destruction):** Initiating account deletion permanently and irreversibly unlinks and purges your user profile, credentials, training history, uploaded media, and all monthly nutrition records from active storage.

---

## 4. Third-Party Integrations

When you use external search or barcode features, only the minimal query is forwarded:
- **USDA FoodData Central:** Search keywords (e.g., "oatmeal") are queried to retrieve public domain nutrient data. No user identity or account data is attached.
- **Open Food Facts:** Scanned barcode numbers are checked against Open Food Facts (ODbL) to obtain food package information.
- **Google Sign-In (Optional):** If you select Google authentication, Google's identity token verifies your email. NXT FORM does not access your Google Drive, contacts, or other Google services.

---

## 5. Contact & Data Protection Officer

For privacy inquiries, data subject access requests, or regulatory questions:
- **Email:** `privacy@nxtform.com`
- **Feedback & Issues:** In-app via **Settings → About → Send feedback**.
