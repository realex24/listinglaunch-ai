const STORAGE_KEY = "listinglaunchai.v2";
const TOAST_DURATION = 1800;

const planLimits = {
  starter: 3,
  growth: 10,
  pro: Number.POSITIVE_INFINITY,
};

const assetTabs = [
  {
    id: "overview",
    label: "Overview",
    title: "Listing Overview",
    description: "Review the listing facts, brand setup, and content status.",
  },
  {
    id: "mls",
    label: "MLS",
    title: "MLS Description",
    description: "Concise, factual listing copy for MLS and syndication channels.",
  },
  {
    id: "website",
    label: "Website",
    title: "Website Description",
    description: "A warmer, more narrative version for your site or property page.",
  },
  {
    id: "instagram",
    label: "Instagram",
    title: "Instagram Caption",
    description: "Short social copy with hooks, CTA, and hashtags.",
  },
  {
    id: "facebook",
    label: "Facebook",
    title: "Facebook Post",
    description: "Community-forward copy for sphere and neighborhood reach.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    title: "LinkedIn Post",
    description: "Professional framing with credibility and market context.",
  },
  {
    id: "email",
    label: "Email",
    title: "Email Announcement",
    description: "Subject line plus body copy for sphere or buyer database sends.",
  },
  {
    id: "sms",
    label: "SMS",
    title: "SMS Teaser",
    description: "Short, mobile-friendly text designed to prompt fast replies.",
  },
  {
    id: "flyer",
    label: "Flyer",
    title: "Flyer Copy",
    description: "Headline and bullet copy for flyers, brochures, and print pieces.",
  },
  {
    id: "video",
    label: "Video",
    title: "Video Script",
    description: "A short-form walkthrough script to record as a Reel or story.",
  },
  {
    id: "calendar",
    label: "7-Day Plan",
    title: "7-Day Content Calendar",
    description: "A listing-by-listing publishing plan for the next week.",
  },
  {
    id: "followup",
    label: "Follow-Up",
    title: "Follow-Up Sequence",
    description: "Post-open-house and inquiry follow-up messages.",
  },
];

const brandDefaults = {
  agentName: "Alex Rivera",
  brokerageName: "Harbor & Oak Realty",
  market: "Tampa Bay, Florida",
  brandTone: "confident",
  ctaDefault: "Schedule a private tour",
  specialty: "Move-up buyers and coastal homes",
  complianceNotes: "Equal housing opportunity. Buyers should independently verify measurements, HOA information, and school zoning.",
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

const toneLead = {
  confident: "A standout home that balances style, function, and buyer-ready appeal.",
  friendly: "A warm, welcoming home that feels easy to picture yourself in from the moment you arrive.",
  luxury: "A refined residence with elevated finishes, polished flow, and a distinctly premium feel.",
  direct: "A smart, move-in-ready listing with the features buyers ask for most and a location that works.",
};

const state = loadState();
let currentTab = "overview";
let toastTimer = null;

const brandForm = document.querySelector("#brand-form");
const listingForm = document.querySelector("#listing-form");
const assetTabsContainer = document.querySelector("#asset-tabs");
const assetEditor = document.querySelector("#asset-editor");
const overviewPanel = document.querySelector("#overview-panel");
const toast = document.querySelector("#toast");

init();

function init() {
  renderAssetTabs();
  bindEvents();
  renderAll();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    }
  } catch (_error) {
    // fall back to seeded state
  }

  return seedState();
}

function seedState() {
  const listing = buildListing(sampleListings[0]);
  listing.assets = generateAssets(listing, brandDefaults);
  listing.generatedAt = new Date().toISOString();
  listing.needsRefresh = false;

  return {
    brand: { ...brandDefaults },
    plan: "growth",
    listings: [listing],
    activeListingId: listing.id,
    draft: { ...listing },
    sampleIndex: 0,
  };
}

function normalizeState(input) {
  const listings = Array.isArray(input.listings) ? input.listings.map(normalizeListing) : [];
  const activeListingId = input.activeListingId || listings[0]?.id || null;
  const activeListing = listings.find((listing) => listing.id === activeListingId) || null;

  return {
    brand: { ...brandDefaults, ...(input.brand || {}) },
    plan: Object.keys(planLimits).includes(input.plan) ? input.plan : "growth",
    listings,
    activeListingId,
    draft: input.draft ? normalizeDraft(input.draft) : activeListing ? { ...activeListing } : blankDraft(),
    sampleIndex: Number.isInteger(input.sampleIndex) ? input.sampleIndex % sampleListings.length : 0,
  };
}

function normalizeListing(listing) {
  return {
    id: listing.id || makeId(),
    address: listing.address || "",
    price: listing.price || "",
    details: listing.details || "",
    propertyType: listing.propertyType || "Single-family home",
    audience: listing.audience || "Move-up buyers",
    highlights: listing.highlights || "",
    sellingPoints: listing.sellingPoints || "",
    neighborhoodStory: listing.neighborhoodStory || "",
    openHouse: listing.openHouse || "",
    urgencyAngle: listing.urgencyAngle || "",
    assets: listing.assets || {},
    generatedAt: listing.generatedAt || null,
    createdAt: listing.createdAt || new Date().toISOString(),
    updatedAt: listing.updatedAt || new Date().toISOString(),
    needsRefresh: Boolean(listing.needsRefresh),
  };
}

function normalizeDraft(draft) {
  return {
    ...blankDraft(),
    ...draft,
  };
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

function buildListing(data) {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    ...blankDraft(),
    ...data,
    assets: {},
    generatedAt: null,
    createdAt: now,
    updatedAt: now,
    needsRefresh: false,
  };
}

function makeId() {
  return `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  document.querySelector("#save-brand")?.addEventListener("click", saveBrandProfile);
  document.querySelector("#plan-select")?.addEventListener("change", handlePlanChange);
  document.querySelector("#new-listing")?.addEventListener("click", createNewListing);
  document.querySelector("#load-sample")?.addEventListener("click", loadNextSample);
  document.querySelector("#save-listing")?.addEventListener("click", saveDraftListing);
  document.querySelector("#generate-kit")?.addEventListener("click", generateLaunchKit);
  document.querySelector("#duplicate-current")?.addEventListener("click", duplicateCurrentListing);
  document.querySelector("#reset-app")?.addEventListener("click", resetAppData);
  document.querySelector("#copy-asset")?.addEventListener("click", copyCurrentAsset);
  document.querySelector("#download-asset")?.addEventListener("click", downloadCurrentAsset);
  document.querySelector("#download-bundle")?.addEventListener("click", downloadCurrentBundle);
  document.querySelector("#download-bundle-hero")?.addEventListener("click", downloadCurrentBundle);

  brandForm?.addEventListener("input", syncBrandDraft);
  listingForm?.addEventListener("input", syncListingDraft);

  assetEditor?.addEventListener("input", () => {
    if (currentTab === "overview") return;
    const listing = getActiveListing();
    if (!listing || !listing.assets) return;
    listing.assets[currentTab] = assetEditor.value;
    listing.updatedAt = new Date().toISOString();
    persistState();
    renderSavedListings();
    renderDashboard();
  });

  assetTabsContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    currentTab = button.dataset.tab;
    renderAssetTabs();
    renderAssetPanel();
  });

  document.querySelector("#saved-listings")?.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-id]");
    if (openButton) {
      openListing(openButton.dataset.openId);
      return;
    }

    const duplicateButton = event.target.closest("[data-duplicate-id]");
    if (duplicateButton) {
      duplicateListingById(duplicateButton.dataset.duplicateId);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton) {
      deleteListingById(deleteButton.dataset.deleteId);
    }
  });
}

function syncBrandDraft() {
  if (!brandForm) return;
  const formData = new FormData(brandForm);
  state.brand = {
    agentName: String(formData.get("agentName") || "").trim(),
    brokerageName: String(formData.get("brokerageName") || "").trim(),
    market: String(formData.get("market") || "").trim(),
    brandTone: String(formData.get("brandTone") || "confident").trim(),
    ctaDefault: String(formData.get("ctaDefault") || "").trim(),
    specialty: String(formData.get("specialty") || "").trim(),
    complianceNotes: String(formData.get("complianceNotes") || "").trim(),
  };
  persistState();
}

function syncListingDraft() {
  if (!listingForm) return;
  const formData = new FormData(listingForm);
  state.draft = {
    address: String(formData.get("address") || "").trim(),
    price: String(formData.get("price") || "").trim(),
    details: String(formData.get("details") || "").trim(),
    propertyType: String(formData.get("propertyType") || "Single-family home").trim(),
    audience: String(formData.get("audience") || "Move-up buyers").trim(),
    highlights: String(formData.get("highlights") || "").trim(),
    sellingPoints: String(formData.get("sellingPoints") || "").trim(),
    neighborhoodStory: String(formData.get("neighborhoodStory") || "").trim(),
    openHouse: String(formData.get("openHouse") || "").trim(),
    urgencyAngle: String(formData.get("urgencyAngle") || "").trim(),
  };
  persistState();
}

function saveBrandProfile() {
  syncBrandDraft();
  showToast("Brand profile saved");
  renderDashboard();
  renderAssetPanel();
}

function handlePlanChange(event) {
  state.plan = event.target.value;
  persistState();
  renderDashboard();
  renderPlanUsage();
  showToast("Plan updated");
}

function createNewListing() {
  state.activeListingId = null;
  state.draft = blankDraft();
  currentTab = "overview";
  persistState();
  renderAll();
  showToast("New listing draft ready");
}

function loadNextSample() {
  state.sampleIndex = (state.sampleIndex + 1) % sampleListings.length;
  state.activeListingId = null;
  state.draft = {
    ...blankDraft(),
    ...sampleListings[state.sampleIndex],
  };
  currentTab = "overview";
  persistState();
  renderAll();
  showToast("Sample listing loaded");
}

function saveDraftListing() {
  syncListingDraft();
  if (!state.draft.address) {
    showToast("Add a property address first");
    return;
  }

  const existing = getActiveListing();
  const listing = existing
    ? {
        ...existing,
        ...state.draft,
        updatedAt: new Date().toISOString(),
        needsRefresh: Boolean(existing.generatedAt),
      }
    : {
        ...buildListing(state.draft),
        needsRefresh: false,
      };

  upsertListing(listing);
  state.activeListingId = listing.id;
  state.draft = { ...listing };
  persistState();
  renderAll();
  showToast(existing ? "Draft updated. Regenerate to refresh copy." : "Draft saved");
}

function generateLaunchKit() {
  syncListingDraft();

  if (!state.draft.address || !state.draft.price || !state.draft.details) {
    showToast("Address, price, and details are required to generate");
    return;
  }

  const existing = getActiveListing();
  const isNewListing = !existing;
  const canGenerate = existing || state.listings.length < planLimits[state.plan];

  if (!canGenerate) {
    showToast("Plan limit reached. Switch plans or edit an existing listing.");
    return;
  }

  const base = existing
    ? {
        ...existing,
        ...state.draft,
      }
    : buildListing(state.draft);

  base.assets = generateAssets(base, state.brand);
  base.generatedAt = new Date().toISOString();
  base.updatedAt = new Date().toISOString();
  base.needsRefresh = false;

  upsertListing(base);
  state.activeListingId = base.id;
  state.draft = { ...base };
  currentTab = "overview";
  persistState();
  renderAll();
  showToast(isNewListing ? "Listing saved and launch kit generated" : "Launch kit regenerated");
}

function upsertListing(listing) {
  const index = state.listings.findIndex((item) => item.id === listing.id);
  if (index >= 0) {
    state.listings[index] = listing;
  } else {
    state.listings.unshift(listing);
  }
}

function getActiveListing() {
  if (!state.activeListingId) return null;
  return state.listings.find((listing) => listing.id === state.activeListingId) || null;
}

function openListing(id) {
  const listing = state.listings.find((item) => item.id === id);
  if (!listing) return;
  state.activeListingId = id;
  state.draft = { ...listing };
  currentTab = "overview";
  persistState();
  renderAll();
}

function duplicateCurrentListing() {
  const listing = getActiveListing();
  if (!listing) {
    showToast("Open a saved listing to duplicate it");
    return;
  }
  duplicateListingById(listing.id);
}

function duplicateListingById(id) {
  const listing = state.listings.find((item) => item.id === id);
  if (!listing) return;
  const copy = {
    ...JSON.parse(JSON.stringify(listing)),
    id: makeId(),
    address: `${listing.address} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.listings.unshift(copy);
  state.activeListingId = copy.id;
  state.draft = { ...copy };
  persistState();
  renderAll();
  showToast("Listing duplicated");
}

function deleteListingById(id) {
  const listing = state.listings.find((item) => item.id === id);
  if (!listing) return;
  const confirmed = window.confirm(`Delete ${listing.address}?`);
  if (!confirmed) return;

  state.listings = state.listings.filter((item) => item.id !== id);
  if (state.activeListingId === id) {
    const next = state.listings[0] || null;
    state.activeListingId = next?.id || null;
    state.draft = next ? { ...next } : blankDraft();
  }
  persistState();
  renderAll();
  showToast("Listing deleted");
}

function resetAppData() {
  const confirmed = window.confirm("Reset all brand and listing data for this local app?");
  if (!confirmed) return;

  const fresh = seedState();
  state.brand = fresh.brand;
  state.plan = fresh.plan;
  state.listings = fresh.listings;
  state.activeListingId = fresh.activeListingId;
  state.draft = fresh.draft;
  state.sampleIndex = fresh.sampleIndex;
  currentTab = "overview";
  persistState();
  renderAll();
  showToast("App reset to starter state");
}

function renderAll() {
  renderBrandForm();
  renderPlanUsage();
  renderListingForm();
  renderSavedListings();
  renderDashboard();
  renderAssetTabs();
  renderAssetPanel();
}

function renderBrandForm() {
  setFieldValue("#agentName", state.brand.agentName);
  setFieldValue("#brokerageName", state.brand.brokerageName);
  setFieldValue("#market", state.brand.market);
  setFieldValue("#brandTone", state.brand.brandTone);
  setFieldValue("#ctaDefault", state.brand.ctaDefault);
  setFieldValue("#specialty", state.brand.specialty);
  setFieldValue("#complianceNotes", state.brand.complianceNotes);
}

function renderPlanUsage() {
  const limit = planLimits[state.plan];
  document.querySelector("#plan-select").value = state.plan;
  document.querySelector("#plan-limit").textContent = Number.isFinite(limit) ? String(limit) : "Unlimited";
  document.querySelector("#plan-used").textContent = String(state.listings.length);
}

function renderListingForm() {
  const active = getActiveListing();
  const source = state.activeListingId && active ? active : state.draft;

  setFieldValue("#address", source.address || "");
  setFieldValue("#price", source.price || "");
  setFieldValue("#details", source.details || "");
  setFieldValue("#propertyType", source.propertyType || "Single-family home");
  setFieldValue("#audience", source.audience || "Move-up buyers");
  setFieldValue("#highlights", source.highlights || "");
  setFieldValue("#sellingPoints", source.sellingPoints || "");
  setFieldValue("#neighborhoodStory", source.neighborhoodStory || "");
  setFieldValue("#openHouse", source.openHouse || "");
  setFieldValue("#urgencyAngle", source.urgencyAngle || "");

  const heading = active ? active.address : source.address ? source.address : "New listing draft";
  document.querySelector("#current-listing-heading").textContent = heading;
}

function renderSavedListings() {
  const container = document.querySelector("#saved-listings");
  if (!container) return;

  if (!state.listings.length) {
    container.innerHTML =
      '<article class="saved-listing-item"><strong>No listings yet</strong><p class="saved-listing-meta">Create a new listing or load a sample to start generating.</p></article>';
    return;
  }

  container.innerHTML = state.listings
    .map((listing) => {
      const activeClass = listing.id === state.activeListingId ? " active" : "";
      const status = listing.generatedAt
        ? listing.needsRefresh
          ? "Needs refresh"
          : "Ready"
        : "Draft only";
      return `
        <article class="saved-listing-item${activeClass}">
          <span class="saved-listing-name">${escapeHtml(listing.address)}</span>
          <p class="saved-listing-meta">
            ${escapeHtml(listing.price || "No price")} • ${escapeHtml(listing.details || "No details")}<br />
            ${escapeHtml(status)} • Updated ${formatShortDate(listing.updatedAt)}
          </p>
          <div class="saved-listing-actions">
            <button class="ghost-button" type="button" data-open-id="${listing.id}">Open</button>
            <button class="ghost-button" type="button" data-duplicate-id="${listing.id}">Duplicate</button>
            <button class="ghost-button danger" type="button" data-delete-id="${listing.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboard() {
  const active = getActiveListing();
  const assetCount = active?.assets ? Object.values(active.assets).filter(Boolean).length : 0;
  const openHouse = active?.openHouse || "Not set";
  const status = active
    ? active.needsRefresh
      ? "Draft updated. Regenerate launch kit."
      : active.generatedAt
        ? "Launch kit ready"
        : "Draft saved"
    : "No active listing selected";

  document.querySelector("#metric-listings").textContent = String(state.listings.length);
  document.querySelector("#metric-assets").textContent = String(assetCount);
  document.querySelector("#metric-plan").textContent = capitalize(state.plan);
  document.querySelector("#metric-open-house").textContent = openHouse;
  document.querySelector("#workspace-status").textContent = status;
}

function renderAssetTabs() {
  if (!assetTabsContainer) return;
  assetTabsContainer.innerHTML = assetTabs
    .map(
      (tab) => `
        <button
          class="tab-button${tab.id === currentTab ? " active" : ""}"
          type="button"
          data-tab="${tab.id}"
          role="tab"
          aria-selected="${tab.id === currentTab ? "true" : "false"}"
        >
          ${tab.label}
        </button>
      `
    )
    .join("");
}

function renderAssetPanel() {
  const active = getActiveListing();
  const tab = assetTabs.find((item) => item.id === currentTab) || assetTabs[0];
  const hasAssets = Boolean(active?.assets && Object.keys(active.assets).length);

  document.querySelector("#kit-heading").textContent = active
    ? active.address
    : "Generate or load a listing to edit assets";
  document.querySelector("#asset-title").textContent = tab.title;
  document.querySelector("#asset-description").textContent = tab.description;
  document.querySelector("#asset-status").textContent = active
    ? active.generatedAt
      ? active.needsRefresh
        ? "Assets saved but need refresh"
        : "Assets generated"
      : "Draft only"
    : "No listing selected";

  if (currentTab === "overview") {
    overviewPanel.classList.remove("hidden");
    assetEditor.classList.add("hidden");
    renderOverviewCards(active);
    return;
  }

  overviewPanel.classList.add("hidden");
  assetEditor.classList.remove("hidden");

  if (!active || !hasAssets) {
    assetEditor.value = "";
    assetEditor.placeholder = "Generate a launch kit to start editing this asset.";
    assetEditor.disabled = true;
    return;
  }

  assetEditor.disabled = false;
  assetEditor.placeholder = "Edit your generated copy here.";
  assetEditor.value = active.assets[currentTab] || "";
}

function renderOverviewCards(active) {
  if (!active) {
    overviewPanel.innerHTML = `
      <article class="overview-card">
        <h4>How to use this workspace</h4>
        <p>Save your brand profile, create a listing, and click "Generate Launch Kit" to create editable marketing assets.</p>
      </article>
      <article class="overview-card">
        <h4>Persistence</h4>
        <p>Your brand settings, listings, and edits are saved locally in this browser via local storage.</p>
      </article>
      <article class="overview-card">
        <h4>Exports</h4>
        <p>Use the bundle download action to export all copy for the currently active listing into one text file.</p>
      </article>
    `;
    return;
  }

  const generatedCount = active.assets ? Object.values(active.assets).filter(Boolean).length : 0;
  const status = active.generatedAt
    ? active.needsRefresh
      ? "Generated, but listing fields changed after the last run"
      : "Launch kit generated and current"
    : "Draft saved without generated assets";

  overviewPanel.innerHTML = `
    <article class="overview-card">
      <h4>Property</h4>
      <p>${escapeHtml(active.address)}<br />${escapeHtml(active.propertyType)} • ${escapeHtml(active.details)}<br />${escapeHtml(active.price)}</p>
    </article>
    <article class="overview-card">
      <h4>Audience & CTA</h4>
      <p>${escapeHtml(active.audience)}<br />${escapeHtml(state.brand.ctaDefault || "Set a default CTA in brand settings")}</p>
    </article>
    <article class="overview-card">
      <h4>Status</h4>
      <p>${escapeHtml(status)}<br />Assets available: ${generatedCount}</p>
    </article>
    <article class="overview-card">
      <h4>Selling Points</h4>
      <p>${escapeHtml(active.sellingPoints || "Add selling points in the listing form")}</p>
    </article>
    <article class="overview-card">
      <h4>Neighborhood Story</h4>
      <p>${escapeHtml(active.neighborhoodStory || "Add a local narrative to strengthen copy")}</p>
    </article>
    <article class="overview-card">
      <h4>Compliance Notes</h4>
      <p>${escapeHtml(state.brand.complianceNotes || "No compliance note saved")}</p>
    </article>
  `;
}

function generateAssets(listing, brand) {
  const toneSummary = toneLead[brand.brandTone] || toneLead.confident;
  const shortAddress = getShortAddress(listing.address);
  const highlightLead = capitalize(firstPhrase(listing.highlights));
  const sellingLead = capitalize(firstPhrase(listing.sellingPoints));
  const cta = brand.ctaDefault || "Schedule a private tour";
  const compliance = brand.complianceNotes ? `\n\n${brand.complianceNotes}` : "";

  return {
    mls: `${listing.address} is offered at ${listing.price} and features ${listing.details}. ${toneSummary} This ${listing.propertyType.toLowerCase()} stands out with ${toSentence(
      listing.sellingPoints
    )}. Buyers will appreciate ${toSentence(listing.highlights)}. Best suited for ${listing.audience.toLowerCase()}, this opportunity is ${listing.urgencyAngle.toLowerCase()}. ${cta}.${compliance}`,
    website: `${shortAddress} presents a polished blend of everyday function and buyer-ready style. From ${toSentence(
      listing.sellingPoints
    )} to ${toSentence(listing.highlights)}, the home is designed for someone who wants more than a basic listing. ${listing.neighborhoodStory} ${brand.agentName} at ${brand.brokerageName} is marketing the property for ${listing.audience.toLowerCase()} in ${brand.market}. ${cta}.`,
    instagram: `Just listed in ${brand.market}: ${shortAddress} for ${listing.price}. ${listing.details}. ${sellingLead}. ${highlightLead}. ${cta}. #JustListed #RealEstate #${slugTag(
      listing.propertyType
    )} #${slugTag(brand.market)}`,
    facebook: `New to market: ${listing.address}.\n\nPrice: ${listing.price}\nDetails: ${listing.details}\n\nWhy buyers will care: ${toSentence(
      listing.sellingPoints
    )}. The setting also delivers ${toSentence(listing.highlights)}.\n\nOpen house: ${listing.openHouse || "Private tours available"}.\n\n${cta}.`,
    linkedin: `Fresh listing update from ${brand.agentName} at ${brand.brokerageName}: ${listing.address} is now live at ${listing.price}. This ${listing.propertyType.toLowerCase()} offers ${listing.details} and is positioned for ${listing.audience.toLowerCase()}. Strong buyer hooks include ${toSentence(
      listing.sellingPoints
    )}. In a market like ${brand.market}, ${listing.urgencyAngle.toLowerCase()}. ${cta}.`,
    email: `Subject: New listing alert at ${shortAddress}\n\nA new property just hit the market at ${listing.address} for ${listing.price}.\n\nKey details:\n- ${listing.details}\n- ${listing.propertyType}\n- Buyer fit: ${listing.audience}\n\nWhat makes it stand out:\n${bulletize(listing.sellingPoints)}\n\nLocation highlights:\n${bulletize(listing.highlights)}\n\nOpen house: ${listing.openHouse || "Private tours available"}\n\n${brand.agentName}\n${brand.brokerageName}\n${cta}.${compliance}`,
    sms: `New listing: ${shortAddress}, ${listing.details}, offered at ${listing.price}. ${sellingLead}. ${cta}.`,
    flyer: `Headline: ${shortAddress}\nSubheadline: ${listing.price} • ${listing.details}\n\nFlyer bullets:\n${bulletize(
      listing.sellingPoints
    )}\n\nNeighborhood angle:\n- ${capitalize(toSentence(listing.highlights))}\n\nCTA:\n- ${cta}`,
    video: `Video hook: Welcome to ${shortAddress}, a ${listing.propertyType.toLowerCase()} in ${brand.market} priced at ${listing.price}.\n\nScene 1: Exterior + neighborhood arrival\nTalk track: Mention ${toSentence(
      listing.highlights
    )}.\n\nScene 2: Main living space\nTalk track: Focus on ${sellingLead.toLowerCase()}.\n\nScene 3: Kitchen and entertaining flow\nTalk track: Show why this layout works for ${listing.audience.toLowerCase()}.\n\nScene 4: Primary suite or standout room\nTalk track: Tie the feeling back to ${listing.urgencyAngle.toLowerCase()}.\n\nClose: ${cta}.`,
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
    )}. Let me know if you’d like a private showing.\n\nMessage 3: Final follow-up on ${shortAddress}. If this one is not the right fit, I can also send similar options in ${brand.market}.`,
  };
}

function renderBundleText(listing) {
  if (!listing || !listing.assets) return "";

  const sections = assetTabs
    .filter((tab) => tab.id !== "overview")
    .map((tab) => {
      const content = listing.assets[tab.id] || "";
      return `${tab.title}\n${"-".repeat(tab.title.length)}\n${content}`;
    })
    .join("\n\n");

  return `ListingLaunch AI Bundle\n======================\n\nAddress: ${listing.address}\nPrice: ${listing.price}\nDetails: ${listing.details}\nProperty type: ${listing.propertyType}\nAudience: ${listing.audience}\nGenerated: ${listing.generatedAt || "Not generated"}\n\n${sections}`;
}

async function copyCurrentAsset() {
  const active = getActiveListing();
  if (!active || currentTab === "overview") {
    showToast("Choose a generated asset first");
    return;
  }
  const content = active.assets?.[currentTab];
  if (!content) {
    showToast("No content available in this asset");
    return;
  }
  await copyText(content);
  showToast("Asset copied");
}

function downloadCurrentAsset() {
  const active = getActiveListing();
  if (!active || currentTab === "overview") {
    showToast("Choose a generated asset first");
    return;
  }
  const content = active.assets?.[currentTab];
  if (!content) {
    showToast("No content available in this asset");
    return;
  }
  downloadFile(`${slugify(active.address)}-${currentTab}.txt`, content);
  showToast("Asset download started");
}

function downloadCurrentBundle() {
  const active = getActiveListing();
  if (!active || !active.assets || !Object.keys(active.assets).length) {
    showToast("Generate a launch kit before downloading the bundle");
    return;
  }
  downloadFile(`${slugify(active.address)}-launch-kit.txt`, renderBundleText(active));
  showToast("Bundle download started");
}

function setFieldValue(selector, value) {
  const field = document.querySelector(selector);
  if (field) field.value = value;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, TOAST_DURATION);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "true");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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
    .map((part) => `- ${capitalize(part.trim())}`)
    .join("\n");
}

function getShortAddress(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
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

function formatShortDate(value) {
  if (!value) return "just now";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (_error) {
    return "just now";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
