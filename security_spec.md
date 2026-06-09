# Security Specification for MetaZo PRO Firebase Real-time Engine

## 1. Data Invariants
- **Branding**: Anyone can read the application's branding, but only authenticated users with high authority (or simply the reseller, i.e., local passcode holders or direct write gates) can modify the branding config.
- **License Keys**: Anyone can attempt to read a specific license key during the activation flow to check its state, but list operations and key modifications (creating, resetting, deleting) are strictly restricted to reseller sessions to protect against scraper bots.
- **Single-device Activation**: An anonymous or registered buyer can activate a clear, unused license key once. Once activated, they cannot modify the keys of other users, and cannot reset their own key.

## 2. The "Dirty Dozen" Threat Payloads
1. Unauthorized Branding Update: Attempt to rewrite `branding/main` fields without authorized authentication.
2. Shadow Field Injection: Adding `isAdmin: true` or rogue properties into `keys/MY-KEY` during activation.
3. Rapid Key Hijacking: Changing an already-activated key (`activated: true`) to target a different device ID or user email.
4. Key Scraping / List Flooding: Attempting to query `/keys` collection as an anonymous user without credentials or filtering rules.
5. Insecure Identity Spoofing: Submitting an activation payload where the user details mismatch the registered device identity.

## 3. Threat Safeguards Map
- Global deny by default rules.
- Key write actions require checking against current state to prevent double-activation.
- All timestamps rely on server-time (`request.time`).
