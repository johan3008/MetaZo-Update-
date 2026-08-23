<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fbf59a1c-9fc6-4c20-897b-601c91e0126b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## MetadataGen Search Intent Keywords

MetadataGen keyword generation covers nouns, actions, descriptive terms, natural specific phrases, and supported conceptual/contextual search intent without fixed category quotas. Semantic canonicalization and relevance filtering remain deterministic.

## MetadataGen AI-Only Keyword Semantics

Keyword semantics, search-intent roles, semantic equivalence, phrase selection, and ranking are determined by the AI from visual evidence. The application does not use hardcoded noun/verb/adjective/concept vocabulary lists; code only performs mechanical output validation.

## CSVPlanet-style AI Keyword Ranking

MetadataGen now uses an AI-first ranking policy modeled on CSVPlanet's publicly described workflow: strongest keywords first, specific subject/location/action/concept/usage coverage, niche/concept coverage, natural phrases, and commercial-intent terms when supported. The vocabulary remains AI-generated rather than hardcoded.
