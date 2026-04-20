const presets = [
  {
    address: "123 Harbor View Dr, Tampa, FL",
    price: "$685,000",
    details: "4 bed • 3 bath • 2,480 sqft",
    highlights:
      "Tree-lined street, top-rated schools, quick drive to downtown, walkable coffee spots, and a backyard designed for entertaining.",
    sellingPoints:
      "Open-concept kitchen, oversized windows, primary suite with spa bath, covered patio, and move-in-ready finishes.",
    tone: "confident",
    cta: "Schedule a private tour",
    openHouse: "Saturday, 1 PM to 4 PM",
  },
  {
    address: "88 Maple Crest Ln, Charlotte, NC",
    price: "$529,000",
    details: "3 bed • 2.5 bath • 1,960 sqft",
    highlights:
      "Quiet cul-de-sac, neighborhood greenway access, short commute to Uptown, and nearby weekend dining favorites.",
    sellingPoints:
      "Renovated kitchen, vaulted living room, flexible office nook, fenced yard, and fresh designer lighting throughout.",
    tone: "friendly",
    cta: "Join us at the open house",
    openHouse: "Sunday, 12 PM to 3 PM",
  },
  {
    address: "17 Westover Park, Austin, TX",
    price: "$1,190,000",
    details: "4 bed • 3.5 bath • 3,140 sqft",
    highlights:
      "Boutique pocket neighborhood, minutes from downtown, private outdoor spaces, and high-end dining nearby.",
    sellingPoints:
      "Custom millwork, chef's kitchen, statement staircase, serene primary suite, and resort-style plunge pool.",
    tone: "luxury",
    cta: "Request pricing details",
    openHouse: "Private showings this weekend",
  },
];

const toneLead = {
  confident: "A standout home that balances style, function, and buyer-ready appeal.",
  friendly: "A warm, welcoming home that feels easy to picture yourself in from the moment you arrive.",
  luxury: "A refined residence with elevated finishes, polished flow, and a distinctly premium feel.",
  direct: "A smart, move-in-ready listing with the features buyers ask for most and a location that works.",
};

const form = document.querySelector("#listing-form");
const sampleButton = document.querySelector("#load-sample");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const copyButtons = document.querySelectorAll(".copy-button");

let presetIndex = 0;

function normalize(formData) {
  return {
    address: formData.get("address")?.trim() || "Your listing",
    price: formData.get("price")?.trim() || "Price on request",
    details: formData.get("details")?.trim() || "Listing details coming soon",
    highlights: formData.get("highlights")?.trim() || "Neighborhood highlights coming soon",
    sellingPoints: formData.get("sellingPoints")?.trim() || "Selling points coming soon",
    tone: formData.get("tone")?.trim() || "confident",
    cta: formData.get("cta")?.trim() || "Schedule a private tour",
    openHouse: formData.get("openHouse")?.trim() || "Open house details coming soon",
  };
}

function makeOutputs(data) {
  const toneSummary = toneLead[data.tone] || toneLead.confident;

  return {
    mls: `${data.address} is offered at ${data.price} and features ${data.details}. ${toneSummary} Inside, buyers will notice ${trimSentence(
      data.sellingPoints
    )}. Located near ${trimSentence(data.highlights)}. ${data.cta}.`,
    instagram: `Just listed: ${data.address} for ${data.price}. ${data.details}. ${capitalizeSentence(
      firstPhrase(data.sellingPoints)
    )} plus a location close to ${trimSentence(data.highlights)} ${data.cta}. #JustListed #RealEstate #DreamHome`,
    email: `Subject: New listing alert at ${shortAddress(data.address)}\n\nA new opportunity just hit the market at ${data.address}. Priced at ${data.price}, this home offers ${data.details} with standout features like ${trimSentence(
      data.sellingPoints
    )}. Buyers will also love ${trimSentence(data.highlights)}.\n\nOpen house: ${data.openHouse}.\n\n${data.cta}.`,
    sms: `New listing at ${shortAddress(data.address)}: ${data.details} for ${data.price}. ${capitalizeSentence(
      firstPhrase(data.sellingPoints)
    )}. ${data.cta}.`,
    calendar: [
      `Day 1: Publish MLS copy and website description highlighting ${firstPhrase(data.sellingPoints)}.`,
      `Day 2: Post Instagram teaser focused on lifestyle and ${firstPhrase(data.highlights)}.`,
      `Day 3: Send email announcement to sphere and active buyers with the open house details.`,
      `Day 4: Share a short video walkthrough script centered on the home's strongest visual moments.`,
      `Day 5: Post neighborhood-focused content featuring ${firstPhrase(data.highlights)}.`,
      `Day 6: Send SMS reminder for ${data.openHouse}.`,
      `Day 7: Publish final urgency post and CTA: ${data.cta}.`,
    ],
  };
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

function firstPhrase(value) {
  return value.split(",")[0].trim().toLowerCase();
}

function shortAddress(value) {
  return value.split(",")[0].trim();
}

function trimSentence(value) {
  return value.replace(/\.$/, "").trim().toLowerCase();
}

function capitalizeSentence(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderOutputs(data) {
  const outputs = makeOutputs(data);

  document.querySelector("#output-title").textContent = data.address;
  document.querySelector("#mls-content").textContent = outputs.mls;
  document.querySelector("#instagram-content").textContent = outputs.instagram;
  document.querySelector("#email-content").textContent = outputs.email;
  document.querySelector("#sms-content").textContent = outputs.sms;

  const calendarList = document.querySelector("#calendar-content");
  calendarList.innerHTML = "";
  outputs.calendar.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    calendarList.appendChild(li);
  });
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

function loadPreset(index) {
  const preset = presets[index];
  if (!preset) return;

  Object.entries(preset).forEach(([key, value]) => {
    const field = document.querySelector(`#${key}`);
    if (field) field.value = value;
  });

  renderOutputs(preset);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = normalize(new FormData(form));
  renderOutputs(data);
});

sampleButton?.addEventListener("click", () => {
  presetIndex = (presetIndex + 1) % presets.length;
  loadPreset(presetIndex);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.dataset.copyTarget;
    const target = document.querySelector(`#${targetId}`);
    if (!target) return;

    try {
      await copyText(target.textContent || "");
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    } catch (_error) {
      button.textContent = "Copy failed";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    }
  });
});

loadPreset(presetIndex);
setActiveTab("mls");
