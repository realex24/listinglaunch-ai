const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const SESSION_COOKIE = "ll_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const JSON_LIMIT = 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const SAMPLE_PROFILE = {
  brokerageName: "",
  market: "",
  brandTone: "confident",
  ctaDefault: "Schedule a private tour",
  specialty: "",
  complianceNotes:
    "Equal housing opportunity. Buyers should independently verify measurements, HOA information, and school zoning.",
};

const planLimits = {
  starter: 3,
  growth: 10,
  pro: Number.POSITIVE_INFINITY,
};

let writeChain = Promise.resolve();

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

async function start() {
  await ensureDataFile();
  const server = http.createServer(handleRequest);
  server.listen(PORT, HOST, () => {
    console.log(`ListingLaunch AI running at http://${HOST}:${PORT}`);
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(res, error.statusCode, { error: error.message });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readJsonBody(req);
    const payload = await mutateDb((db) => registerUser(db, body));
    sendJson(res, 201, payload.body, payload.headers);
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const payload = await mutateDb((db) => loginUser(db, body));
    sendJson(res, 200, payload.body, payload.headers);
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const payload = await mutateDb((db) => logoutUser(db, req));
    sendJson(res, 200, payload.body, payload.headers);
    return;
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const db = await readDb();
    cleanupExpiredSessions(db);
    const user = getUserFromRequest(req, db);
    if (!user) {
      sendJson(res, 200, { user: null });
      return;
    }
    sendJson(res, 200, { user: sanitizeUser(user) });
    return;
  }

  if (pathname === "/api/bootstrap" && req.method === "GET") {
    const db = await readDb();
    cleanupExpiredSessions(db);
    const user = requireUser(req, db);
    sendJson(res, 200, {
      user: sanitizeUser(user),
      profile: user.profile,
      listings: sortListings(user.listings || []),
    });
    return;
  }

  if (pathname === "/api/profile" && req.method === "GET") {
    const db = await readDb();
    cleanupExpiredSessions(db);
    const user = requireUser(req, db);
    sendJson(res, 200, { profile: user.profile });
    return;
  }

  if (pathname === "/api/profile" && req.method === "PUT") {
    const body = await readJsonBody(req);
    const payload = await mutateDb((db) => updateProfile(db, req, body));
    sendJson(res, 200, payload.body);
    return;
  }

  if (pathname === "/api/account/plan" && req.method === "PUT") {
    const body = await readJsonBody(req);
    const payload = await mutateDb((db) => updatePlan(db, req, body));
    sendJson(res, 200, payload.body);
    return;
  }

  if (pathname === "/api/listings" && req.method === "GET") {
    const db = await readDb();
    cleanupExpiredSessions(db);
    const user = requireUser(req, db);
    sendJson(res, 200, { listings: sortListings(user.listings || []) });
    return;
  }

  if (pathname === "/api/listings" && req.method === "POST") {
    const body = await readJsonBody(req);
    const payload = await mutateDb((db) => createListing(db, req, body));
    sendJson(res, 201, payload.body);
    return;
  }

  const listingActionMatch = pathname.match(/^\/api\/listings\/([^/]+)\/(generate|duplicate|export)$/);
  if (listingActionMatch) {
    const listingId = decodeURIComponent(listingActionMatch[1]);
    const action = listingActionMatch[2];

    if (action === "generate" && req.method === "POST") {
      const payload = await mutateDb((db) => generateListingAssets(db, req, listingId));
      sendJson(res, 200, payload.body);
      return;
    }

    if (action === "duplicate" && req.method === "POST") {
      const payload = await mutateDb((db) => duplicateListing(db, req, listingId));
      sendJson(res, 201, payload.body);
      return;
    }

    if (action === "export" && req.method === "GET") {
      const db = await readDb();
      cleanupExpiredSessions(db);
      const user = requireUser(req, db);
      const listing = requireListing(user, listingId);
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slugify(listing.address)}-launch-kit.txt"`,
      });
      res.end(renderBundleText(listing));
      return;
    }
  }

  const listingMatch = pathname.match(/^\/api\/listings\/([^/]+)$/);
  if (listingMatch) {
    const listingId = decodeURIComponent(listingMatch[1]);

    if (req.method === "GET") {
      const db = await readDb();
      cleanupExpiredSessions(db);
      const user = requireUser(req, db);
      const listing = requireListing(user, listingId);
      sendJson(res, 200, { listing });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const payload = await mutateDb((db) => updateListing(db, req, listingId, body));
      sendJson(res, 200, payload.body);
      return;
    }

    if (req.method === "DELETE") {
      const payload = await mutateDb((db) => deleteListing(db, req, listingId));
      sendJson(res, 200, payload.body);
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
}

async function serveStatic(res, pathname) {
  let relativePath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    throw new ApiError(403, "Forbidden");
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });
    res.end(content);
  } catch (_error) {
    if (pathname !== "/index.html" && pathname !== "/") {
      await serveStatic(res, "/index.html");
      return;
    }
    throw new ApiError(404, "File not found");
  }
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch (_error) {
    const emptyDb = { users: [], sessions: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyDb, null, 2));
  }
}

async function readDb() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const db = JSON.parse(raw);
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  return db;
}

async function mutateDb(mutator) {
  const task = async () => {
    const db = await readDb();
    cleanupExpiredSessions(db);
    const result = await mutator(db);
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2));
    return result;
  };

  writeChain = writeChain.then(task, task);
  return writeChain;
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > JSON_LIMIT) {
      throw new ApiError(413, "Payload too large");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (_error) {
    throw new ApiError(400, "Invalid JSON");
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function registerUser(db, body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name) throw new ApiError(400, "Name is required");
  if (!email || !email.includes("@")) throw new ApiError(400, "A valid email is required");
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");

  const existing = db.users.find((user) => user.email === email);
  if (existing) throw new ApiError(409, "An account with that email already exists");

  const passwordSalt = randomId("salt");
  const user = {
    id: randomId("usr"),
    name,
    email,
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
    createdAt: new Date().toISOString(),
    plan: "growth",
    profile: {
      ...SAMPLE_PROFILE,
      agentName: name,
    },
    listings: [],
  };

  db.users.push(user);
  const session = createSession(db, user.id);

  return {
    body: {
      user: sanitizeUser(user),
      profile: user.profile,
      listings: [],
    },
    headers: {
      "Set-Cookie": serializeSessionCookie(session.token),
    },
  };
}

function loginUser(db, body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const user = db.users.find((entry) => entry.email === email);
  if (!user) throw new ApiError(401, "Invalid email or password");

  const candidateHash = hashPassword(password, user.passwordSalt);
  if (candidateHash !== user.passwordHash) {
    throw new ApiError(401, "Invalid email or password");
  }

  const session = createSession(db, user.id);
  return {
    body: {
      user: sanitizeUser(user),
      profile: user.profile,
      listings: sortListings(user.listings || []),
    },
    headers: {
      "Set-Cookie": serializeSessionCookie(session.token),
    },
  };
}

function logoutUser(db, req) {
  const token = getSessionToken(req);
  if (token) {
    const tokenHash = hashToken(token);
    db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
  }

  return {
    body: { ok: true },
    headers: {
      "Set-Cookie": clearSessionCookie(),
    },
  };
}

function updateProfile(db, req, body) {
  const user = requireUser(req, db);
  user.profile = {
    ...user.profile,
    agentName: String(body.agentName || user.profile.agentName || user.name).trim(),
    brokerageName: String(body.brokerageName || "").trim(),
    market: String(body.market || "").trim(),
    brandTone: validTone(body.brandTone) ? body.brandTone : user.profile.brandTone,
    ctaDefault: String(body.ctaDefault || "").trim(),
    specialty: String(body.specialty || "").trim(),
    complianceNotes: String(body.complianceNotes || "").trim(),
  };
  return { body: { profile: user.profile } };
}

function updatePlan(db, req, body) {
  const user = requireUser(req, db);
  const plan = String(body.plan || "").trim();
  if (!Object.prototype.hasOwnProperty.call(planLimits, plan)) {
    throw new ApiError(400, "Invalid plan");
  }

  if (plan !== "pro" && user.listings.length > planLimits[plan]) {
    throw new ApiError(409, "Current listing count exceeds the selected plan");
  }

  user.plan = plan;
  return { body: { user: sanitizeUser(user) } };
}

function createListing(db, req, body) {
  const user = requireUser(req, db);
  enforcePlanLimit(user);
  const listing = buildListing(body);
  user.listings.unshift(listing);
  return { body: { listing } };
}

function updateListing(db, req, listingId, body) {
  const user = requireUser(req, db);
  const listing = requireListing(user, listingId);
  const sanitized = sanitizeListingBody(body);
  const coreChanged = listingCoreKeys().some(
    (key) => Object.prototype.hasOwnProperty.call(sanitized, key) && listing[key] !== sanitized[key]
  );

  Object.assign(listing, sanitized);

  if (body.assets && typeof body.assets === "object") {
    listing.assets = normalizeAssets(body.assets, listing.assets || {});
  }

  listing.updatedAt = new Date().toISOString();
  if (coreChanged && listing.generatedAt) {
    listing.needsRefresh = true;
  }

  return { body: { listing } };
}

function deleteListing(db, req, listingId) {
  const user = requireUser(req, db);
  const before = user.listings.length;
  user.listings = user.listings.filter((listing) => listing.id !== listingId);
  if (user.listings.length === before) {
    throw new ApiError(404, "Listing not found");
  }
  return { body: { ok: true } };
}

function duplicateListing(db, req, listingId) {
  const user = requireUser(req, db);
  enforcePlanLimit(user);
  const listing = requireListing(user, listingId);
  const clone = JSON.parse(JSON.stringify(listing));
  clone.id = randomId("lst");
  clone.address = `${listing.address} (Copy)`;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  user.listings.unshift(clone);
  return { body: { listing: clone } };
}

function generateListingAssets(db, req, listingId) {
  const user = requireUser(req, db);
  const listing = requireListing(user, listingId);
  listing.assets = generateAssets(listing, user.profile, user);
  listing.generatedAt = new Date().toISOString();
  listing.updatedAt = new Date().toISOString();
  listing.needsRefresh = false;
  return { body: { listing } };
}

function buildListing(body) {
  const sanitized = sanitizeListingPatch(body);
  if (!sanitized.address || !sanitized.price || !sanitized.details) {
    throw new ApiError(400, "Address, price, and details are required");
  }

  const now = new Date().toISOString();
  return {
    id: randomId("lst"),
    address: sanitized.address,
    price: sanitized.price,
    details: sanitized.details,
    propertyType: sanitized.propertyType || "Single-family home",
    audience: sanitized.audience || "Move-up buyers",
    highlights: sanitized.highlights || "",
    sellingPoints: sanitized.sellingPoints || "",
    neighborhoodStory: sanitized.neighborhoodStory || "",
    openHouse: sanitized.openHouse || "",
    urgencyAngle: sanitized.urgencyAngle || "",
    assets: {},
    generatedAt: null,
    createdAt: now,
    updatedAt: now,
    needsRefresh: false,
  };
}

function sanitizeListingBody(body) {
  return sanitizeListingPatch(body);
}

function sanitizeListingPatch(body) {
  const fields = [
    "address",
    "price",
    "details",
    "propertyType",
    "audience",
    "highlights",
    "sellingPoints",
    "neighborhoodStory",
    "openHouse",
    "urgencyAngle",
  ];
  const next = {};

  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      next[key] = String(body[key] || "").trim();
    }
  }

  return next;
}

function normalizeAssets(input, currentAssets) {
  const base = currentAssets || {};
  const next = { ...base };
  for (const [key, value] of Object.entries(input)) {
    next[key] = String(value || "");
  }
  return next;
}

function listingCoreKeys() {
  return [
    "address",
    "price",
    "details",
    "propertyType",
    "audience",
    "highlights",
    "sellingPoints",
    "neighborhoodStory",
    "openHouse",
    "urgencyAngle",
  ];
}

function requireListing(user, listingId) {
  const listing = (user.listings || []).find((entry) => entry.id === listingId);
  if (!listing) throw new ApiError(404, "Listing not found");
  return listing;
}

function requireUser(req, db) {
  const user = getUserFromRequest(req, db);
  if (!user) throw new ApiError(401, "Authentication required");
  return user;
}

function getUserFromRequest(req, db) {
  const token = getSessionToken(req);
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = db.sessions.find(
    (entry) => entry.tokenHash === tokenHash && new Date(entry.expiresAt).getTime() > Date.now()
  );
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function cleanupExpiredSessions(db) {
  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
}

function createSession(db, userId) {
  const token = randomId("session");
  const session = {
    id: randomId("sess"),
    userId,
    tokenHash: hashToken(token),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
  db.sessions.push(session);
  return { ...session, token };
}

function getSessionToken(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const pairs = raw.split(";").map((entry) => entry.trim());
  for (const pair of pairs) {
    if (pair.startsWith(`${SESSION_COOKIE}=`)) {
      return decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1));
    }
  }
  return null;
}

function serializeSessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_DURATION_MS / 1000
  }`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

function enforcePlanLimit(user) {
  const limit = planLimits[user.plan] ?? planLimits.growth;
  if (Number.isFinite(limit) && user.listings.length >= limit) {
    throw new ApiError(403, "Plan limit reached");
  }
}

function generateAssets(listing, profile, user) {
  const toneSummary = toneLead(profile.brandTone);
  const shortAddress = getShortAddress(listing.address);
  const highlightLead = capitalize(firstPhrase(listing.highlights));
  const sellingLead = capitalize(firstPhrase(listing.sellingPoints));
  const cta = profile.ctaDefault || "Schedule a private tour";
  const compliance = profile.complianceNotes ? `\n\n${profile.complianceNotes}` : "";

  return {
    mls: `${listing.address} is offered at ${listing.price} and features ${listing.details}. ${toneSummary} This ${listing.propertyType.toLowerCase()} stands out with ${toSentence(
      listing.sellingPoints
    )}. Buyers will appreciate ${toSentence(listing.highlights)}. Best suited for ${listing.audience.toLowerCase()}, this opportunity is ${toSentence(
      listing.urgencyAngle
    )}. ${cta}.${compliance}`,
    website: `${shortAddress} presents a polished blend of everyday function and buyer-ready style. From ${toSentence(
      listing.sellingPoints
    )} to ${toSentence(listing.highlights)}, the home is designed for someone who wants more than a basic listing. ${listing.neighborhoodStory} ${
      profile.agentName || user.name
    } at ${profile.brokerageName || "your brokerage"} is marketing the property for ${listing.audience.toLowerCase()} in ${
      profile.market || "its local market"
    }. ${cta}.`,
    instagram: `Just listed${profile.market ? ` in ${profile.market}` : ""}: ${shortAddress} for ${listing.price}. ${listing.details}. ${sellingLead}. ${highlightLead}. ${cta}. #JustListed #RealEstate #${slugTag(
      listing.propertyType
    )}${profile.market ? ` #${slugTag(profile.market)}` : ""}`,
    facebook: `New to market: ${listing.address}.\n\nPrice: ${listing.price}\nDetails: ${listing.details}\n\nWhy buyers will care: ${toSentence(
      listing.sellingPoints
    )}. The setting also delivers ${toSentence(listing.highlights)}.\n\nOpen house: ${
      listing.openHouse || "Private tours available"
    }.\n\n${cta}.`,
    linkedin: `Fresh listing update from ${profile.agentName || user.name}${profile.brokerageName ? ` at ${profile.brokerageName}` : ""}: ${
      listing.address
    } is now live at ${listing.price}. This ${listing.propertyType.toLowerCase()} offers ${listing.details} and is positioned for ${listing.audience.toLowerCase()}. Strong buyer hooks include ${toSentence(
      listing.sellingPoints
    )}. ${profile.market ? `In a market like ${profile.market}, ` : ""}${toSentence(listing.urgencyAngle)}. ${cta}.`,
    email: `Subject: New listing alert at ${shortAddress}\n\nA new property just hit the market at ${listing.address} for ${listing.price}.\n\nKey details:\n- ${listing.details}\n- ${
      listing.propertyType
    }\n- Buyer fit: ${listing.audience}\n\nWhat makes it stand out:\n${bulletize(
      listing.sellingPoints
    )}\n\nLocation highlights:\n${bulletize(listing.highlights)}\n\nOpen house: ${
      listing.openHouse || "Private tours available"
    }\n\n${profile.agentName || user.name}\n${profile.brokerageName || ""}\n${cta}.${compliance}`.trim(),
    sms: `New listing: ${shortAddress}, ${listing.details}, offered at ${listing.price}. ${sellingLead}. ${cta}.`,
    flyer: `Headline: ${shortAddress}\nSubheadline: ${listing.price} • ${listing.details}\n\nFlyer bullets:\n${bulletize(
      listing.sellingPoints
    )}\n\nNeighborhood angle:\n- ${capitalize(toSentence(listing.highlights))}\n\nCTA:\n- ${cta}`,
    video: `Video hook: Welcome to ${shortAddress}, a ${listing.propertyType.toLowerCase()}${profile.market ? ` in ${profile.market}` : ""} priced at ${
      listing.price
    }.\n\nScene 1: Exterior + neighborhood arrival\nTalk track: Mention ${toSentence(
      listing.highlights
    )}.\n\nScene 2: Main living space\nTalk track: Focus on ${sellingLead.toLowerCase()}.\n\nScene 3: Kitchen and entertaining flow\nTalk track: Show why this layout works for ${listing.audience.toLowerCase()}.\n\nScene 4: Primary suite or standout room\nTalk track: Tie the feeling back to ${toSentence(
      listing.urgencyAngle
    )}.\n\nClose: ${cta}.`,
    calendar: [
      `Day 1: Publish the MLS description and website copy for ${shortAddress}.`,
      `Day 2: Share the Instagram caption with hero photos and story slides.`,
      `Day 3: Post the Facebook announcement and send the email blast to your sphere.`,
      `Day 4: Record the short video script and post a teaser clip.`,
      `Day 5: Publish a neighborhood-focused post using ${firstPhrase(listing.highlights)} as the hook.`,
      `Day 6: Send an SMS reminder for ${listing.openHouse || "the next private showing window"}.`,
      `Day 7: Publish a final urgency post centered on "${listing.urgencyAngle}".`,
    ].join("\n"),
    followup: `Message 1: Thanks for your interest in ${shortAddress}. I’d be happy to send the full property package and answer any questions.\n\nMessage 2: Quick follow-up on ${shortAddress}. The home offers ${listing.details} with standout features like ${toSentence(
      listing.sellingPoints
    )}. Let me know if you’d like a private showing.\n\nMessage 3: Final follow-up on ${shortAddress}. If this one is not the right fit, I can also send similar options${
      profile.market ? ` in ${profile.market}` : ""
    }.`,
  };
}

function renderBundleText(listing) {
  const titles = {
    mls: "MLS Description",
    website: "Website Description",
    instagram: "Instagram Caption",
    facebook: "Facebook Post",
    linkedin: "LinkedIn Post",
    email: "Email Announcement",
    sms: "SMS Teaser",
    flyer: "Flyer Copy",
    video: "Video Script",
    calendar: "7-Day Content Calendar",
    followup: "Follow-Up Sequence",
  };

  const sections = Object.entries(titles)
    .map(([key, title]) => `${title}\n${"-".repeat(title.length)}\n${listing.assets?.[key] || ""}`)
    .join("\n\n");

  return `ListingLaunch AI Bundle\n======================\n\nAddress: ${listing.address}\nPrice: ${listing.price}\nDetails: ${listing.details}\nProperty type: ${listing.propertyType}\nAudience: ${listing.audience}\nGenerated: ${
    listing.generatedAt || "Not generated"
  }\n\n${sections}`;
}

function toneLead(tone) {
  const map = {
    confident: "A standout home that balances style, function, and buyer-ready appeal.",
    friendly: "A warm, welcoming home that feels easy to picture yourself in from the moment you arrive.",
    luxury: "A refined residence with elevated finishes, polished flow, and a distinctly premium feel.",
    direct: "A smart, move-in-ready listing with the features buyers ask for most and a location that works.",
  };
  return map[tone] || map.confident;
}

function validTone(value) {
  return ["confident", "friendly", "luxury", "direct"].includes(String(value || ""));
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}

function sortListings(listings) {
  return [...listings].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function getShortAddress(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function firstPhrase(value) {
  return String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function toSentence(value) {
  return String(value || "").replace(/\.$/, "").trim().toLowerCase();
}

function bulletize(value) {
  return String(value || "")
    .split(",")
    .filter(Boolean)
    .map((part) => `- ${capitalize(part.trim())}`)
    .join("\n");
}

function slugTag(value) {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 24);
}

function slugify(value) {
  return String(value || "listing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = {
  buildListing,
  generateAssets,
  registerUser,
  loginUser,
  updateProfile,
  updatePlan,
  createListing,
  updateListing,
  duplicateListing,
  deleteListing,
  generateListingAssets,
  renderBundleText,
  sanitizeUser,
  ApiError,
};
