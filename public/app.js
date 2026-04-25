const assetTabs = [
  { id: "overview", label: "Overview", title: "Listing Overview", description: "Review the active listing, brand context, and generation status." },
  { id: "mls", label: "MLS", title: "MLS Description", description: "Concise, factual listing copy for MLS and syndication channels." },
  { id: "website", label: "Website", title: "Website Description", description: "Warmer narrative copy for a property page." },
  { id: "instagram", label: "Instagram", title: "Instagram Caption", description: "Short social copy with a hook and CTA." },
  { id: "facebook", label: "Facebook", title: "Facebook Post", description: "Community-oriented listing announcement." },
  { id: "linkedin", label: "LinkedIn", title: "LinkedIn Post", description: "Professional listing update for your network." },
  { id: "email", label: "Email", title: "Email Announcement", description: "Sphere and database email copy." },
  { id: "sms", label: "SMS", title: "SMS Teaser", description: "Short text message to prompt replies." },
  { id: "flyer", label: "Flyer", title: "Flyer Copy", description: "Headline and bullet copy for print materials." },
  { id: "video", label: "Video", title: "Video Script", description: "Short-form walkthrough script." },
  { id: "calendar", label: "7-Day Plan", title: "7-Day Content Calendar", description: "A week of publishing actions for the listing." },
  { id: "followup", label: "Follow-Up", title: "Follow-Up Sequence", description: "Inquiry and post-open-house follow-up messages." },
];

const planLimits = {
  starter: 3,
  growth: 10,
  pro: Number.POSITIVE_INFINITY,
};

const sampleListings = [
  {
    address: "123 Harbor View Dr, Tampa, FL",
    price: "$685,000",
    details: "4 bed • 3 bath • 2,480 sqft",
    propertyType: "Single-family home",
    audience: "Move-up buyers",
    highlights:
      "Tree-lined street, top-rated schools, quick drive to downtown, walkable coffee spots, and a backyard designed for entertaining.",
    sellingPoints:
      "Open-concept kitchen, oversized windows, primary suite with spa bath, covered patio, and move-in-ready finishes.",
    neighborhoodStory:
      "The neighborhood attracts buyers who want calm residential blocks without giving up quick access to dining, schools, and weekend conveniences.",
    openHouse: "Saturday, 1 PM to 4 PM",
    urgencyAngle: "Fresh to market before peak weekend traffic",
  },
  {
    address: "88 Maple Crest Ln, Charlotte, NC",
    price: "$529,000",
    details: "3 bed • 2.5 bath • 1,960 sqft",
    propertyType: "Townhome",
    audience: "First-time buyers",
    highlights:
      "Quiet cul-de-sac, greenway access, short commute to Uptown, and nearby weekend dining favorites.",
    sellingPoints:
      "Renovated kitchen, vaulted living room, flexible office nook, fenced yard, and fresh designer lighting throughout.",
    neighborhoodStory:
      "This pocket of Charlotte appeals to buyers who want a neighborhood feel with enough proximity to keep commuting and social plans easy.",
    openHouse: "Sunday, 12 PM to 3 PM",
    urgencyAngle: "Turnkey inventory in this area moves quickly",
  },
  {
    address: "17 Westover Park, Austin, TX",
    price: "$1,190,000",
    details: "4 bed • 3.5 bath • 3,140 sqft",
    propertyType: "Luxury residence",
    audience: "Luxury buyers",
    highlights:
      "Boutique pocket neighborhood, minutes from downtown, private outdoor spaces, and high-end dining nearby.",
    sellingPoints:
      "Custom millwork, chef's kitchen, statement staircase, serene primary suite, and resort-style plunge pool.",
    neighborhoodStory:
      "This part of Austin draws buyers who want design-forward homes with privacy, walkability, and easy access to the city core.",
    openHouse: "Private showings this weekend",
    urgencyAngle: "A limited-availability luxury option in a tightly held area",
  },
];

const state = {
  user: null,
  profile: null,
  listings: [],
  activeListingId: null,
  currentTab: "overview",
  draft: blankDraft(),
  sampleIndex: 0,
  saveTimer: null,
};

const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const toast = document.querySelector("#toast");
const assetTabsContainer = document.querySelector("#asset-tabs");
const overviewGrid = document.querySelector("#overview-grid");
const assetEditor = document.querySelector("#asset-editor");
let toastTimer = null;

init();

async function init() {
  bindEvents();
  renderTabs();

  try {
    const session = await api("/api/auth/me");
    if (session.user) {
      await loadBootstrap();
    } else {
      showAuth();
    }
  } catch (_error) {
    showAuth();
  }
}

function bindEvents() {
  document.querySelector("#login-form").addEventListener("submit", handleLogin);
  document.querySelector("#register-form").addEventListener("submit", handleRegister);
  document.querySelector("#logout-button").addEventListener("click", handleLogout);
  document.querySelector("#profile-form").addEventListener("submit", saveProfile);
  document.querySelector("#plan-select").addEventListener("change", updatePlan);
  document.querySelector("#new-listing").addEventListener("click", createNewListing);
  document.querySelector("#load-sample").addEventListener("click", loadSampleListing);
  document.querySelector("#save-listing").addEventListener("click", saveListingDraft);
  document.querySelector("#generate-assets").addEventListener("click", generateAssetsForCurrent);
  document.querySelector("#duplicate-listing").addEventListener("click", duplicateCurrentListing);
  document.querySelector("#delete-listing").addEventListener("click", deleteCurrentListing);
  document.querySelector("#copy-asset").addEventListener("click", copyCurrentAsset);
  document.querySelector("#download-asset").addEventListener("click", downloadCurrentAsset);
  document.querySelector("#download-bundle").addEventListener("click", downloadCurrentBundle);
  document.querySelector("#listing-form").addEventListener("input", syncDraftFromForm);

  assetTabsContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    state.currentTab = button.dataset.tab;
    renderTabs();
    renderAssetPanel();
  });

  document.querySelector("#saved-listings").addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-open-id]");
    if (openButton) {
      openListing(openButton.dataset.openId);
      return;
    }

    const duplicateButton = event.target.closest("[data-duplicate-id]");
    if (duplicateButton) {
      await duplicateListing(duplicateButton.dataset.duplicateId);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton) {
      await deleteListing(deleteButton.dataset.deleteId);
    }
  });

  assetEditor.addEventListener("input", handleAssetEditorInput);
}

async function handleLogin(event) {
  event.preventDefault();
  const payload = {
    email: document.querySelector("#login-email").value.trim(),
    password: document.querySelector("#login-password").value,
  };

  try {
    await api("/api/auth/login", { method: "POST", body: payload });
    await loadBootstrap();
    showToast("Logged in");
    event.target.reset();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const payload = {
    name: document.querySelector("#register-name").value.trim(),
    email: document.querySelector("#register-email").value.trim(),
    password: document.querySelector("#register-password").value,
  };

  try {
    await api("/api/auth/register", { method: "POST", body: payload });
    await loadBootstrap();
    showToast("Account created");
    event.target.reset();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    resetClientState();
    showAuth();
    showToast("Logged out");
  }
}

async function loadBootstrap() {
  const payload = await api("/api/bootstrap");
  state.user = payload.user;
  state.profile = payload.profile;
  state.listings = payload.listings;
  state.activeListingId = payload.listings[0]?.id || null;
  state.currentTab = "overview";
  state.draft = state.activeListingId ? { ...getActiveListing() } : blankDraft();
  showApp();
  renderAll();
}

function showAuth() {
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
  document.querySelector("#logout-button").classList.add("hidden");
  document.querySelector("#user-chip").classList.add("hidden");
}

function showApp() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  document.querySelector("#logout-button").classList.remove("hidden");
  document.querySelector("#user-chip").classList.remove("hidden");
}

function renderAll() {
  renderTopbar();
  renderProfileForm();
  renderPlanUsage();
  renderSavedListings();
  renderListingForm();
  renderDashboard();
  renderTabs();
  renderAssetPanel();
}

function renderTopbar() {
  document.querySelector("#user-chip").textContent = `${state.user.name} • ${state.user.email}`;
}

function renderProfileForm() {
  setField("#profile-agentName", state.profile.agentName || "");
  setField("#profile-brokerageName", state.profile.brokerageName || "");
  setField("#profile-market", state.profile.market || "");
  setField("#profile-brandTone", state.profile.brandTone || "confident");
  setField("#profile-ctaDefault", state.profile.ctaDefault || "");
  setField("#profile-specialty", state.profile.specialty || "");
  setField("#profile-complianceNotes", state.profile.complianceNotes || "");
}

function renderPlanUsage() {
  const limit = planLimits[state.user.plan];
  setField("#plan-select", state.user.plan);
  document.querySelector("#plan-limit").textContent = Number.isFinite(limit) ? String(limit) : "Unlimited";
  document.querySelector("#plan-used").textContent = String(state.listings.length);
}

function renderSavedListings() {
  const container = document.querySelector("#saved-listings");
  if (!state.listings.length) {
    container.innerHTML =
      '<article class="saved-item"><strong>No listings yet</strong><p>Create a new listing or load a sample to begin.</p></article>';
    return;
  }

  container.innerHTML = state.listings
    .map((listing) => {
      const activeClass = listing.id === state.activeListingId ? " active" : "";
      const status = listing.generatedAt ? (listing.needsRefresh ? "Needs refresh" : "Ready") : "Draft";
      return `
        <article class="saved-item${activeClass}">
          <strong>${escapeHtml(listing.address)}</strong>
          <p>${escapeHtml(listing.price || "No price")} • ${escapeHtml(listing.details || "No details")}<br />${escapeHtml(
            status
          )}</p>
          <div class="row-actions">
            <button class="ghost-button" type="button" data-open-id="${listing.id}">Open</button>
            <button class="ghost-button" type="button" data-duplicate-id="${listing.id}">Duplicate</button>
            <button class="ghost-button danger" type="button" data-delete-id="${listing.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderListingForm() {
  const source = state.activeListingId ? getActiveListing() || state.draft : state.draft;
  setField("#listing-address", source.address || "");
  setField("#listing-price", source.price || "");
  setField("#listing-details", source.details || "");
  setField("#listing-propertyType", source.propertyType || "Single-family home");
  setField("#listing-audience", source.audience || "Move-up buyers");
  setField("#listing-highlights", source.highlights || "");
  setField("#listing-sellingPoints", source.sellingPoints || "");
  setField("#listing-neighborhoodStory", source.neighborhoodStory || "");
  setField("#listing-openHouse", source.openHouse || "");
  setField("#listing-urgencyAngle", source.urgencyAngle || "");
  document.querySelector("#listing-heading").textContent = source.address || "New listing draft";
}

function renderDashboard() {
  const active = getActiveListing();
  const assetCount = active?.assets ? Object.values(active.assets).filter(Boolean).length : 0;
  document.querySelector("#dashboard-heading").textContent = active ? active.address : "Workspace ready";
  document.querySelector("#metric-listings").textContent = String(state.listings.length);
  document.querySelector("#metric-assets").textContent = String(assetCount);
  document.querySelector("#metric-plan").textContent = capitalize(state.user.plan);
  document.querySelector("#metric-open-house").textContent = active?.openHouse || "Not set";
  document.querySelector("#workspace-status").textContent = active
    ? active.generatedAt
      ? active.needsRefresh
        ? "Draft changed after generation"
        : "Assets generated"
      : "Draft only"
    : "Ready";
}

function renderTabs() {
  assetTabsContainer.innerHTML = assetTabs
    .map(
      (tab) => `
        <button
          class="tab-button${tab.id === state.currentTab ? " active" : ""}"
          type="button"
          data-tab="${tab.id}"
        >
          ${tab.label}
        </button>
      `
    )
    .join("");
}

function renderAssetPanel() {
  const active = getActiveListing();
  const tab = assetTabs.find((item) => item.id === state.currentTab) || assetTabs[0];
  document.querySelector("#kit-heading").textContent = active ? active.address : "Generate assets for an active listing";
  document.querySelector("#asset-title").textContent = tab.title;
  document.querySelector("#asset-description").textContent = tab.description;
  document.querySelector("#asset-status").textContent = active
    ? active.generatedAt
      ? active.needsRefresh
        ? "Needs refresh"
        : "Ready"
      : "Draft only"
    : "No listing selected";

  if (state.currentTab === "overview") {
    overviewGrid.classList.remove("hidden");
    assetEditor.classList.add("hidden");
    renderOverview(active);
    return;
  }

  overviewGrid.classList.add("hidden");
  assetEditor.classList.remove("hidden");

  if (!active || !active.assets) {
    assetEditor.value = "";
    assetEditor.disabled = true;
    assetEditor.placeholder = "Generate assets to edit this section.";
    return;
  }

  assetEditor.disabled = false;
  assetEditor.placeholder = "Edit generated copy here.";
  assetEditor.value = active.assets[state.currentTab] || "";
}

function renderOverview(active) {
  if (!active) {
    overviewGrid.innerHTML = `
      <article class="overview-card">
        <h4>How it works</h4>
        <p>Create an account, save your profile, add a listing, and generate a launch kit.</p>
      </article>
      <article class="overview-card">
        <h4>Persistence</h4>
        <p>Your account, listings, and assets are stored on the server in the project data file.</p>
      </article>
      <article class="overview-card">
        <h4>Exports</h4>
        <p>Download individual assets or the full listing bundle whenever you are ready to publish.</p>
      </article>
    `;
    return;
  }

  const assetCount = active.assets ? Object.values(active.assets).filter(Boolean).length : 0;
  overviewGrid.innerHTML = `
    <article class="overview-card">
      <h4>Property</h4>
      <p>${escapeHtml(active.address)}<br />${escapeHtml(active.propertyType)} • ${escapeHtml(active.details)}<br />${escapeHtml(
        active.price
      )}</p>
    </article>
    <article class="overview-card">
      <h4>Audience & CTA</h4>
      <p>${escapeHtml(active.audience)}<br />${escapeHtml(state.profile.ctaDefault || "No CTA set")}</p>
    </article>
    <article class="overview-card">
      <h4>Status</h4>
      <p>${escapeHtml(active.generatedAt ? "Launch kit generated" : "Draft only")}<br />Assets available: ${assetCount}</p>
    </article>
    <article class="overview-card">
      <h4>Selling Points</h4>
      <p>${escapeHtml(active.sellingPoints || "Add selling points")}</p>
    </article>
    <article class="overview-card">
      <h4>Neighborhood Story</h4>
      <p>${escapeHtml(active.neighborhoodStory || "Add neighborhood story")}</p>
    </article>
    <article class="overview-card">
      <h4>Compliance Notes</h4>
      <p>${escapeHtml(state.profile.complianceNotes || "No compliance note saved")}</p>
    </article>
  `;
}

async function saveProfile(event) {
  event.preventDefault();
  const payload = {
    agentName: document.querySelector("#profile-agentName").value.trim(),
    brokerageName: document.querySelector("#profile-brokerageName").value.trim(),
    market: document.querySelector("#profile-market").value.trim(),
    brandTone: document.querySelector("#profile-brandTone").value,
    ctaDefault: document.querySelector("#profile-ctaDefault").value.trim(),
    specialty: document.querySelector("#profile-specialty").value.trim(),
    complianceNotes: document.querySelector("#profile-complianceNotes").value.trim(),
  };

  try {
    const response = await api("/api/profile", { method: "PUT", body: payload });
    state.profile = response.profile;
    renderAll();
    showToast("Profile saved");
  } catch (error) {
    showToast(error.message);
  }
}

async function updatePlan(event) {
  try {
    const response = await api("/api/account/plan", {
      method: "PUT",
      body: { plan: event.target.value },
    });
    state.user = response.user;
    renderPlanUsage();
    renderDashboard();
    showToast("Plan updated");
  } catch (error) {
    setField("#plan-select", state.user.plan);
    showToast(error.message);
  }
}

function syncDraftFromForm() {
  state.draft = {
    address: document.querySelector("#listing-address").value.trim(),
    price: document.querySelector("#listing-price").value.trim(),
    details: document.querySelector("#listing-details").value.trim(),
    propertyType: document.querySelector("#listing-propertyType").value,
    audience: document.querySelector("#listing-audience").value,
    highlights: document.querySelector("#listing-highlights").value.trim(),
    sellingPoints: document.querySelector("#listing-sellingPoints").value.trim(),
    neighborhoodStory: document.querySelector("#listing-neighborhoodStory").value.trim(),
    openHouse: document.querySelector("#listing-openHouse").value.trim(),
    urgencyAngle: document.querySelector("#listing-urgencyAngle").value.trim(),
  };
}

function createNewListing() {
  state.activeListingId = null;
  state.currentTab = "overview";
  state.draft = blankDraft();
  renderAll();
  showToast("New listing draft ready");
}

function loadSampleListing() {
  state.sampleIndex = (state.sampleIndex + 1) % sampleListings.length;
  state.activeListingId = null;
  state.currentTab = "overview";
  state.draft = { ...sampleListings[state.sampleIndex] };
  renderAll();
  showToast("Sample listing loaded");
}

async function saveListingDraft() {
  syncDraftFromForm();

  if (!state.draft.address) {
    showToast("Address is required");
    return;
  }

  try {
    if (state.activeListingId) {
      const active = getActiveListing();
      const response = await api(`/api/listings/${state.activeListingId}`, {
        method: "PUT",
        body: {
          ...state.draft,
          assets: active?.assets || {},
        },
      });
      replaceListing(response.listing);
      state.activeListingId = response.listing.id;
      state.draft = { ...response.listing };
    } else {
      const response = await api("/api/listings", {
        method: "POST",
        body: state.draft,
      });
      state.listings.unshift(response.listing);
      state.activeListingId = response.listing.id;
      state.draft = { ...response.listing };
    }

    renderAll();
    showToast("Listing saved");
  } catch (error) {
    showToast(error.message);
  }
}

async function generateAssetsForCurrent() {
  syncDraftFromForm();

  try {
    if (!state.activeListingId) {
      await saveListingDraft();
    } else {
      await saveListingDraft();
    }

    if (!state.activeListingId) return;

    const response = await api(`/api/listings/${state.activeListingId}/generate`, {
      method: "POST",
    });
    replaceListing(response.listing);
    state.draft = { ...response.listing };
    state.currentTab = "overview";
    renderAll();
    showToast("Assets generated");
  } catch (error) {
    showToast(error.message);
  }
}

function openListing(id) {
  const listing = state.listings.find((item) => item.id === id);
  if (!listing) return;
  state.activeListingId = id;
  state.draft = { ...listing };
  state.currentTab = "overview";
  renderAll();
}

async function duplicateCurrentListing() {
  if (!state.activeListingId) {
    showToast("Open a listing first");
    return;
  }
  await duplicateListing(state.activeListingId);
}

async function duplicateListing(id) {
  try {
    const response = await api(`/api/listings/${id}/duplicate`, { method: "POST" });
    state.listings.unshift(response.listing);
    state.activeListingId = response.listing.id;
    state.draft = { ...response.listing };
    state.currentTab = "overview";
    renderAll();
    showToast("Listing duplicated");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteCurrentListing() {
  if (!state.activeListingId) {
    showToast("Open a listing first");
    return;
  }
  await deleteListing(state.activeListingId);
}

async function deleteListing(id) {
  const listing = state.listings.find((entry) => entry.id === id);
  if (!listing) return;

  if (!window.confirm(`Delete ${listing.address}?`)) return;

  try {
    await api(`/api/listings/${id}`, { method: "DELETE" });
    state.listings = state.listings.filter((entry) => entry.id !== id);
    const next = state.listings[0] || null;
    state.activeListingId = next?.id || null;
    state.draft = next ? { ...next } : blankDraft();
    state.currentTab = "overview";
    renderAll();
    showToast("Listing deleted");
  } catch (error) {
    showToast(error.message);
  }
}

function handleAssetEditorInput() {
  if (state.currentTab === "overview" || !state.activeListingId) return;
  const listing = getActiveListing();
  if (!listing) return;
  listing.assets = listing.assets || {};
  listing.assets[state.currentTab] = assetEditor.value;
  listing.updatedAt = new Date().toISOString();

  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(async () => {
    try {
      const response = await api(`/api/listings/${listing.id}`, {
        method: "PUT",
        body: {
          assets: listing.assets,
        },
      });
      replaceListing(response.listing);
      state.draft = { ...response.listing };
      renderSavedListings();
      renderDashboard();
      showToast("Asset saved");
    } catch (error) {
      showToast(error.message);
    }
  }, 700);
}

async function copyCurrentAsset() {
  const listing = getActiveListing();
  if (!listing || state.currentTab === "overview") {
    showToast("Choose an asset first");
    return;
  }

  const content = listing.assets?.[state.currentTab];
  if (!content) {
    showToast("No content in this asset");
    return;
  }

  await copyText(content);
  showToast("Asset copied");
}

function downloadCurrentAsset() {
  const listing = getActiveListing();
  if (!listing || state.currentTab === "overview") {
    showToast("Choose an asset first");
    return;
  }

  const content = listing.assets?.[state.currentTab];
  if (!content) {
    showToast("No content in this asset");
    return;
  }

  downloadText(`${slugify(listing.address)}-${state.currentTab}.txt`, content);
  showToast("Asset download started");
}

function downloadCurrentBundle() {
  const listing = getActiveListing();
  if (!listing || !listing.assets) {
    showToast("Generate assets first");
    return;
  }

  window.location.href = `/api/listings/${listing.id}/export`;
}

function getActiveListing() {
  return state.listings.find((listing) => listing.id === state.activeListingId) || null;
}

function replaceListing(updatedListing) {
  const index = state.listings.findIndex((listing) => listing.id === updatedListing.id);
  if (index >= 0) {
    state.listings[index] = updatedListing;
  } else {
    state.listings.unshift(updatedListing);
  }
}

function blankDraft() {
  return {
    address: "",
    price: "",
    details: "",
    propertyType: "Single-family home",
    audience: "Move-up buyers",
    highlights: "",
    sellingPoints: "",
    neighborhoodStory: "",
    openHouse: "",
    urgencyAngle: "",
  };
}

function resetClientState() {
  state.user = null;
  state.profile = null;
  state.listings = [];
  state.activeListingId = null;
  state.currentTab = "overview";
  state.draft = blankDraft();
}

async function api(url, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "same-origin",
  };

  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload;
}

function setField(selector, value) {
  const field = document.querySelector(selector);
  if (field) field.value = value;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 1800);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
