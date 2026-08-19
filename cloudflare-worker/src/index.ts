/**
 * Cloudflare Worker for Metazo Adobe Stock AI Assistant
 * Built with Cloudflare D1 (SQL Database) and R2 (Storage)
 */

export interface Env {
  DB: D1Database;
  STORAGE_BUCKET?: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

// Simple JSON response helper
function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Or configure from Env.CORS_ORIGIN
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

// Handle OPTIONS requests (CORS preflight)
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Custom JWT Helper using native Web Crypto API (Avoids external dependency)
async function signJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const tokenToSign = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(tokenToSign)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${tokenToSign}.${encodedSignature}`;
}

async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const tokenToVerify = `${header}.${payload}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const sigBytes = new Uint8Array(
      atob(signature.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(tokenToVerify)
    );
    
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    // Check expiration if exp field is present
    if (decodedPayload.exp && decodedPayload.exp < Date.now() / 1000) {
      return null;
    }
    
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // Auth Token Parsing
    const authHeader = request.headers.get("Authorization");
    let currentUser: any = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      currentUser = await verifyJWT(token, env.JWT_SECRET);
    }

    try {
      // ----------------------------------------------------
      // AUTHENTICATION ENDPOINTS
      // ----------------------------------------------------
      if (path === "/api/auth/register" && request.method === "POST") {
        const body: any = await request.json();
        const { email, uid, display_name } = body; // Can sync existing user from client or create custom auth
        
        if (!email || !uid) {
          return jsonResponse({ error: "Missing email or uid" }, 400);
        }

        // Insert user or update if already exists
        await env.DB.prepare(
          `INSERT INTO users (uid, email, display_name, trial_start) 
           VALUES (?, ?, ?, ?) 
           ON CONFLICT(uid) DO UPDATE SET display_name = COALESCE(?, display_name)`
        ).bind(uid, email, display_name || "", new Date().toISOString(), display_name || "").run();

        // Initialize user settings if empty
        await env.DB.prepare(
          `INSERT OR IGNORE INTO user_settings (uid) VALUES (?)`
        ).bind(uid).run();

        // Create JWT
        const token = await signJWT({ uid, email, role: "user" }, env.JWT_SECRET);
        return jsonResponse({ success: true, token, user: { uid, email, display_name } });
      }

      if (path === "/api/auth/login" && request.method === "POST") {
        const body: any = await request.json();
        const { uid } = body; // Simplified OAuth/custom verification
        
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first<any>();
        if (!user) {
          return jsonResponse({ error: "User not found" }, 404);
        }

        const token = await signJWT({ uid: user.uid, email: user.email, role: "user" }, env.JWT_SECRET);
        return jsonResponse({ success: true, token, user });
      }

      // Ensure all subsequent endpoints require authentication
      if (!currentUser && (path.startsWith("/api/users") || path.startsWith("/api/keys") || path.startsWith("/api/promos") || path.startsWith("/api/chats"))) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      // ----------------------------------------------------
      // USER PROFILE & USAGE ENDPOINTS
      // ----------------------------------------------------
      if (path === "/api/users/profile" && request.method === "GET") {
        const uid = currentUser.uid;
        
        // Fetch user + settings combined
        const userAndSettings = await env.DB.prepare(`
          SELECT u.*, 
                 s.gemini_api_key, s.groq_api_key, s.mistral_api_key, s.openai_api_key, 
                 s.openrouter_api_key, s.blackbox_api_key, s.nvidia_api_key, s.bluesminds_api_key, s.aivene_api_key,
                 s.ai_provider, s.mz_gemini_model, s.mz_groq_model, s.mz_nvidia_model, s.mz_aivene_model,
                 s.ui_language, s.keyword_mode, s.title_length, s.metadata_language
          FROM users u
          LEFT JOIN user_settings s ON u.uid = s.uid
          WHERE u.uid = ?
        `).bind(uid).first<any>();

        if (!userAndSettings) {
          return jsonResponse({ error: "User not found" }, 404);
        }

        // Fetch daily usage for today
        const todayStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
        const usageRows = await env.DB.prepare(
          "SELECT tool_type, count FROM daily_usage WHERE uid = ? AND date_str = ?"
        ).bind(uid, todayStr).all<any>();

        const dailyUsage: Record<string, number> = {};
        usageRows.results.forEach((row) => {
          dailyUsage[row.tool_type] = row.count;
        });

        // Structure similar to Firestore document
        const responseData = {
          email: userAndSettings.email,
          displayName: userAndSettings.display_name,
          licenseKey: userAndSettings.license_key,
          trialStart: userAndSettings.trial_start,
          createdAt: userAndSettings.created_at,
          updatedAt: userAndSettings.updated_at,
          dailyUsage: {
            [todayStr]: dailyUsage
          },
          settings: {
            gemini_api_key: userAndSettings.gemini_api_key || "",
            groq_api_key: userAndSettings.groq_api_key || "",
            mistral_api_key: userAndSettings.mistral_api_key || "",
            openai_api_key: userAndSettings.openai_api_key || "",
            openrouter_api_key: userAndSettings.openrouter_api_key || "",
            blackbox_api_key: userAndSettings.blackbox_api_key || "",
            nvidia_api_key: userAndSettings.nvidia_api_key || "",
            bluesminds_api_key: userAndSettings.bluesminds_api_key || "",
            aivene_api_key: userAndSettings.aivene_api_key || "",
            ai_provider: userAndSettings.ai_provider || "gemini",
            mz_gemini_model: userAndSettings.mz_gemini_model || "",
            mz_groq_model: userAndSettings.mz_groq_model || "",
            mz_nvidia_model: userAndSettings.mz_nvidia_model || "",
            mz_aivene_model: userAndSettings.mz_aivene_model || "",
            uiLanguage: userAndSettings.ui_language || "en",
            keywordMode: userAndSettings.keyword_mode || "commercial",
            titleLength: userAndSettings.title_length || "medium",
            metadataLanguage: userAndSettings.metadata_language || "en"
          }
        };

        return jsonResponse({ success: true, data: responseData });
      }

      if (path === "/api/users/profile" && request.method === "POST") {
        const uid = currentUser.uid;
        const body: any = await request.json();
        
        // Handle User Profile update
        if (body.licenseKey !== undefined) {
          await env.DB.prepare("UPDATE users SET license_key = ?, updated_at = ? WHERE uid = ?")
            .bind(body.licenseKey, new Date().toISOString(), uid).run();
        }

        // Handle Settings update
        if (body.settings) {
          const s = body.settings;
          await env.DB.prepare(`
            INSERT INTO user_settings (
              uid, gemini_api_key, groq_api_key, mistral_api_key, openai_api_key, 
              openrouter_api_key, blackbox_api_key, nvidia_api_key, bluesminds_api_key, aivene_api_key,
              ai_provider, mz_gemini_model, mz_groq_model, mz_nvidia_model, mz_aivene_model,
              ui_language, keyword_mode, title_length, metadata_language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              gemini_api_key = COALESCE(?, gemini_api_key),
              groq_api_key = COALESCE(?, groq_api_key),
              mistral_api_key = COALESCE(?, mistral_api_key),
              openai_api_key = COALESCE(?, openai_api_key),
              openrouter_api_key = COALESCE(?, openrouter_api_key),
              blackbox_api_key = COALESCE(?, blackbox_api_key),
              nvidia_api_key = COALESCE(?, nvidia_api_key),
              bluesminds_api_key = COALESCE(?, bluesminds_api_key),
              aivene_api_key = COALESCE(?, aivene_api_key),
              ai_provider = COALESCE(?, ai_provider),
              mz_gemini_model = COALESCE(?, mz_gemini_model),
              mz_groq_model = COALESCE(?, mz_groq_model),
              mz_nvidia_model = COALESCE(?, mz_nvidia_model),
              mz_aivene_model = COALESCE(?, mz_aivene_model),
              ui_language = COALESCE(?, ui_language),
              keyword_mode = COALESCE(?, keyword_mode),
              title_length = COALESCE(?, title_length),
              metadata_language = COALESCE(?, metadata_language)
          `).bind(
            uid,
            s.gemini_api_key, s.groq_api_key, s.mistral_api_key, s.openai_api_key,
            s.openrouter_api_key, s.blackbox_api_key, s.nvidia_api_key, s.bluesminds_api_key, s.aivene_api_key,
            s.ai_provider, s.mz_gemini_model, s.mz_groq_model, s.mz_nvidia_model, s.mz_aivene_model,
            s.uiLanguage, s.keywordMode, s.titleLength, s.metadataLanguage,
            // DO UPDATE list:
            s.gemini_api_key, s.groq_api_key, s.mistral_api_key, s.openai_api_key,
            s.openrouter_api_key, s.blackbox_api_key, s.nvidia_api_key, s.bluesminds_api_key, s.aivene_api_key,
            s.ai_provider, s.mz_gemini_model, s.mz_groq_model, s.mz_nvidia_model, s.mz_aivene_model,
            s.uiLanguage, s.keywordMode, s.titleLength, s.metadataLanguage
          ).run();
        }

        // Handle Increment usage
        if (body.incrementUsage) {
          const { dateStr, toolType } = body.incrementUsage;
          await env.DB.prepare(`
            INSERT INTO daily_usage (uid, date_str, tool_type, count) 
            VALUES (?, ?, ?, 1)
            ON CONFLICT(uid, date_str, tool_type) DO UPDATE SET count = count + 1
          `).bind(uid, dateStr, toolType).run();
        }

        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // SERIAL LICENSE KEYS ENDPOINTS
      // ----------------------------------------------------
      if (path === "/api/keys" && request.method === "GET") {
        const keys = await env.DB.prepare("SELECT * FROM license_keys ORDER BY created_at DESC").all<any>();
        return jsonResponse({ success: true, data: keys.results });
      }

      if (path === "/api/keys" && request.method === "POST") {
        const body: any = await request.json();
        const { key, durationDays } = body;
        
        if (!key) return jsonResponse({ error: "Missing key" }, 400);

        await env.DB.prepare(
          "INSERT INTO license_keys (key, duration_days, activated) VALUES (?, ?, 0)"
        ).bind(key, durationDays || 30).run();

        return jsonResponse({ success: true });
      }

      if (path.startsWith("/api/keys/activate/") && request.method === "POST") {
        const key = decodeURIComponent(path.substring(19));
        const uid = currentUser.uid;

        // Check if key is valid and not activated
        const kObj = await env.DB.prepare("SELECT * FROM license_keys WHERE key = ?").bind(key).first<any>();
        if (!kObj) {
          return jsonResponse({ error: "Key not found" }, 404);
        }

        if (kObj.activated === 1) {
          if (kObj.activated_by === uid) {
            return jsonResponse({ success: true, alreadyActivatedByMe: true, durationDays: kObj.duration_days });
          }
          return jsonResponse({ error: "Key already registered to another account" }, 400);
        }

        // Activate the key
        const activatedAt = new Date().toISOString();
        await env.DB.prepare(
          "UPDATE license_keys SET activated = 1, activated_by = ?, activated_at = ? WHERE key = ?"
        ).bind(uid, activatedAt, key).run();

        // Update user license_key
        await env.DB.prepare("UPDATE users SET license_key = ? WHERE uid = ?").bind(key, uid).run();

        return jsonResponse({ success: true, durationDays: kObj.duration_days });
      }

      if (path.startsWith("/api/keys/delete/") && request.method === "DELETE") {
        const key = decodeURIComponent(path.substring(17));
        await env.DB.prepare("DELETE FROM license_keys WHERE key = ?").bind(key).run();
        return jsonResponse({ success: true });
      }

      if (path.startsWith("/api/keys/reset/") && request.method === "POST") {
        const key = decodeURIComponent(path.substring(16));
        await env.DB.prepare(
          "UPDATE license_keys SET activated = 0, activated_by = NULL, activated_at = NULL WHERE key = ?"
        ).bind(key).run();
        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // PROMO CODES ENDPOINTS
      // ----------------------------------------------------
      if (path === "/api/promos" && request.method === "GET") {
        const promos = await env.DB.prepare("SELECT * FROM promos ORDER BY created_at DESC").all<any>();
        return jsonResponse({ success: true, data: promos.results });
      }

      if (path === "/api/promos" && request.method === "POST") {
        const body: any = await request.json();
        const { code, type, value } = body;
        
        if (!code || !type || value === undefined) {
          return jsonResponse({ error: "Missing parameters" }, 400);
        }

        await env.DB.prepare(
          "INSERT OR REPLACE INTO promos (code, type, value, activated) VALUES (?, ?, ?, 0)"
        ).bind(code, type, value).run();

        return jsonResponse({ success: true });
      }

      if (path.startsWith("/api/promos/verify/") && request.method === "GET") {
        const code = decodeURIComponent(path.substring(19)).toUpperCase().trim();
        const promo = await env.DB.prepare("SELECT * FROM promos WHERE code = ?").bind(code).first<any>();
        
        if (!promo) {
          return jsonResponse({ error: "Promo code not found" }, 404);
        }

        return jsonResponse({ success: true, data: promo });
      }

      if (path.startsWith("/api/promos/delete/") && request.method === "DELETE") {
        const code = decodeURIComponent(path.substring(19));
        await env.DB.prepare("DELETE FROM promos WHERE code = ?").bind(code).run();
        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // SUPPORT CHAT & DM ENDPOINTS
      // ----------------------------------------------------
      if (path === "/api/chats/global" && request.method === "GET") {
        const messages = await env.DB.prepare(
          "SELECT * FROM global_messages ORDER BY timestamp DESC LIMIT 50"
        ).all<any>();
        return jsonResponse({ success: true, data: messages.results.reverse() });
      }

      if (path === "/api/chats/global" && request.method === "POST") {
        const body: any = await request.json();
        const { text, senderName, id } = body;
        const uid = currentUser.uid;
        const email = currentUser.email;

        const msgId = id || crypto.randomUUID();
        const timestamp = Date.now();

        await env.DB.prepare(`
          INSERT INTO global_messages (id, text, sender_uid, sender_email, sender_name, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(msgId, text, uid, email, senderName || "", timestamp).run();

        return jsonResponse({ success: true, data: { id: msgId, text, senderUid: uid, senderEmail: email, senderName, timestamp } });
      }

      if (path === "/api/chats/rooms" && request.method === "GET") {
        const uid = currentUser.uid;
        const rooms = await env.DB.prepare(`
          SELECT * FROM direct_chats WHERE user1 = ? OR user2 = ? ORDER BY timestamp DESC
        `).bind(uid, uid).all<any>();
        return jsonResponse({ success: true, data: rooms.results });
      }

      if (path.startsWith("/api/chats/rooms/") && request.method === "GET") {
        const roomId = path.substring(17);
        const messages = await env.DB.prepare(
          "SELECT * FROM chat_messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 40"
        ).bind(roomId).all<any>();
        return jsonResponse({ success: true, data: messages.results.reverse() });
      }

      if (path.startsWith("/api/chats/rooms/") && request.method === "POST") {
        const roomId = path.substring(17);
        const body: any = await request.json();
        const { text, partnerId, partnerEmail, partnerName, id } = body;
        const uid = currentUser.uid;
        const email = currentUser.email;

        const msgId = id || crypto.randomUUID();
        const timestamp = Date.now();

        // 1. Ensure chat room exists, or create it
        await env.DB.prepare(`
          INSERT INTO direct_chats (room_id, user1, user2, last_message, timestamp)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(room_id) DO UPDATE SET last_message = ?, timestamp = ?
        `).bind(
          roomId, 
          uid, 
          partnerId || "admin", 
          text, 
          timestamp,
          text,
          timestamp
        ).run();

        // 2. Insert message
        await env.DB.prepare(`
          INSERT INTO chat_messages (id, room_id, text, sender_uid, sender_email, sender_name, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(msgId, roomId, text, uid, email, partnerName || "", timestamp).run();

        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // FEEDBACK SUBMISSION ENDPOINT
      // ----------------------------------------------------
      if (path === "/api/feedback" && request.method === "POST") {
        const body: any = await request.json();
        const { message, email, userId } = body;

        await env.DB.prepare(
          "INSERT INTO feedback (message, user_email, user_id) VALUES (?, ?, ?)"
        ).bind(message, email || "", userId || "").run();

        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // R2 FILE STORAGE ENDPOINTS
      // ----------------------------------------------------
      if (path.startsWith("/api/storage/upload") && request.method === "POST") {
        if (!env.STORAGE_BUCKET) {
          return jsonResponse({ error: "R2 Storage not configured on this Worker" }, 501);
        }
        
        const filename = url.searchParams.get("file") || crypto.randomUUID();
        const blob = await request.blob();
        
        // Save to R2 bucket
        await env.STORAGE_BUCKET.put(filename, blob, {
          httpMetadata: { contentType: request.headers.get("Content-Type") || "application/octet-stream" }
        });

        const downloadUrl = `${url.origin}/api/storage/download?file=${encodeURIComponent(filename)}`;
        return jsonResponse({ success: true, downloadUrl, filename });
      }

      if (path === "/api/storage/download" && request.method === "GET") {
        if (!env.STORAGE_BUCKET) {
          return jsonResponse({ error: "R2 Storage not configured" }, 501);
        }
        
        const filename = url.searchParams.get("file");
        if (!filename) return jsonResponse({ error: "Missing filename" }, 400);

        const object = await env.STORAGE_BUCKET.get(filename);
        if (!object) return jsonResponse({ error: "File not found" }, 404);

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(object.body, { headers });
      }

      // Default fallback
      return jsonResponse({ error: "Not Found" }, 404);

    } catch (err: any) {
      return jsonResponse({ error: err.message || String(err) }, 500);
    }
  },
};
