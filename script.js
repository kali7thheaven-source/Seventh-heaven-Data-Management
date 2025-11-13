const STORAGE_KEY = "studioClientRecords";

const clientForm = document.querySelector("#clientForm");
const clientsTableBody = document.querySelector("#clientsTableBody");
const detailsPanel = document.querySelector("#detailsPanel");
const detailsTemplate = document.querySelector("#detailsTemplate");
const searchInput = document.querySelector("#searchInput");
const addClientBtn = document.querySelector("#addClientBtn");
const monthlyReportBtn = document.querySelector("#monthlyReportBtn");
const yearlyReportBtn = document.querySelector("#yearlyReportBtn");
const reportModal = document.querySelector("#reportModal");
const reportTitle = document.querySelector("#reportTitle");
const reportBody = document.querySelector("#reportBody");
const closeReportBtn = document.querySelector("#closeReportBtn");
const resetFormBtn = document.querySelector("#resetFormBtn");
const clientsCardList = document.querySelector("#clientsCardList");
const summaryTotalClients = document.querySelector("#summaryTotalClients");
const summaryUpcoming = document.querySelector("#summaryUpcoming");
const summaryPending = document.querySelector("#summaryPending");
const summaryAdvance = document.querySelector("#summaryAdvance");

const DEFAULT_CURRENCY = "INR";
const DEFAULT_LOCALE = "en-IN";
let currencyFormatter;

const SAMPLE_CLIENTS = [
  {
    clientName: "Pradeep & Anu",
    weddingDate: "2025-02-23",
    venue: "Silver Leaf Convention, Salem, India",
    mapLink: "https://www.google.com/maps/place/Silver+Leaf+Convention,+Salem",
    packageDetails: "Silver Package",
    deliverables:
      "Wedding album, traditional video coverage, candid highlights, pre-wedding album, pre-wedding video",
    paymentInfo: "Total: ₹2,80,000 · Balance due 15 days before wedding",
    advancePayment: 90000,
    paymentStatus: "In Progress",
  },
  {
    clientName: "Ramani & Rajitha",
    weddingDate: "2024-12-14",
    venue: "Golden Aura Hall, Erode, India",
    mapLink: "https://www.google.com/maps/place/Golden+Aura+Hall,+Erode",
    packageDetails: "Gold Package",
    deliverables:
      "Wedding album, traditional full-length video, candid cinema edit, pre & post wedding albums, pre & post wedding videos",
    paymentInfo: "Total: ₹3,40,000 · Balance due on wedding day",
    advancePayment: 120000,
    paymentStatus: "Pending",
  },
  {
    clientName: "Gokul & Pooja",
    weddingDate: "2025-05-18",
    venue: "Platinum Meadows, Tiruppur, India",
    mapLink: "https://www.google.com/maps/place/Platinum+Meadows,+Tiruppur",
    packageDetails: "Platinum Package",
    deliverables:
      "Premium wedding album set, traditional multi-cam video, cinematic candid film, pre/post wedding albums, pre/post wedding documentary",
    paymentInfo: "Total: ₹4,10,000 · Balance due 30 days before wedding",
    advancePayment: 200000,
    paymentStatus: "In Progress",
  },
  {
    clientName: "Deepak & Deepika",
    weddingDate: "2024-08-09",
    venue: "Diamond Shore Resort, Erode, India",
    mapLink: "https://www.google.com/maps/place/Diamond+Shore+Resort,+Erode",
    packageDetails: "Diamond Package",
    deliverables:
      "Luxury wedding album suite, traditional & candid master videos, pre/post wedding albums, pre/post wedding cinematic film",
    paymentInfo: "Total: ₹4,60,000 · Paid in full",
    advancePayment: 460000,
    paymentStatus: "Paid",
  },
];

let clients = [];
let selectedClientId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadClients();
  renderClients();
  attachEventListeners();
});

function attachEventListeners() {
  clientForm.addEventListener("submit", handleFormSubmit);
  resetFormBtn.addEventListener("click", resetForm);
  addClientBtn?.addEventListener("click", handleAddClientShortcut);
  searchInput.addEventListener("input", renderClients);
  clientsTableBody.addEventListener("click", handleTableActions);
  clientsCardList?.addEventListener("click", handleTableActions);
  monthlyReportBtn.addEventListener("click", () => openReport("monthly"));
  yearlyReportBtn.addEventListener("click", () => openReport("yearly"));
  closeReportBtn.addEventListener("click", closeReport);
  reportModal.addEventListener("click", (event) => {
    if (event.target === reportModal) {
      closeReport();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !reportModal.hasAttribute("hidden")) {
      closeReport();
    }
  });
}

function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    clients = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load clients:", error);
    clients = [];
  }

  if (!clients.length) {
    clients = SAMPLE_CLIENTS.map((client) => ({
      ...client,
      id: generateClientId(),
      createdAt: Date.now(),
    }));
    saveClients();
  }
}

function saveClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(clientForm);

  const client = {
    id: formData.get("clientId") || generateClientId(),
    clientName: formData.get("clientName").trim(),
    weddingDate: formData.get("weddingDate"),
    venue: formData.get("venue").trim(),
    mapLink: formData.get("mapLink").trim(),
    packageDetails: formData.get("packageDetails").trim(),
    deliverables: formData.get("deliverables").trim(),
    paymentInfo: formData.get("paymentInfo").trim(),
    advancePayment: parseMoney(formData.get("advancePayment")),
    paymentStatus: formData.get("paymentStatus"),
    createdAt: Date.now(),
  };

  const existingIndex = clients.findIndex((item) => item.id === client.id);
  if (existingIndex >= 0) {
    clients[existingIndex] = { ...clients[existingIndex], ...client };
    showToast("Client updated");
  } else {
    clients.push(client);
    showToast("Client added");
  }

  saveClients();
  renderClients();
  selectClient(client.id);
  resetForm();
}

function parseMoney(value) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function renderClients() {
  const searchTerm = searchInput.value?.toLowerCase().trim() ?? "";
  const filtered = clients
    .filter((client) => {
      if (!searchTerm) return true;
      return (
        client.clientName.toLowerCase().includes(searchTerm) ||
        client.venue.toLowerCase().includes(searchTerm) ||
        client.packageDetails.toLowerCase().includes(searchTerm) ||
        client.paymentStatus.toLowerCase().includes(searchTerm)
      );
    })
    .sort((a, b) => new Date(a.weddingDate) - new Date(b.weddingDate));

  updateSummary();

  clientsTableBody.innerHTML = "";
  if (clientsCardList) {
    clientsCardList.innerHTML = "";
  }

  if (!filtered.length) {
    const message = clients.length
      ? "No clients match your search."
      : "No clients yet. Add your first client above.";
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7" class="empty-row">${message}</td>`;
    clientsTableBody.appendChild(row);
    if (clientsCardList) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-cards";
      emptyMessage.textContent = message;
      clientsCardList.appendChild(emptyMessage);
    }
    if (!clients.length) {
      detailsPanel.innerHTML = `<h2>Client Details</h2><p class="empty-state">Add your first client to see details here.</p>`;
    }
    markSelectedInLists();
    return;
  }

  for (const client of filtered) {
    const statusClass = client.paymentStatus
      ? `status-${client.paymentStatus.replace(/\s+/g, "-").toLowerCase()}`
      : "";

    const row = document.createElement("tr");
    row.dataset.id = client.id;
    row.innerHTML = `
      <td>${client.clientName || "—"}</td>
      <td>${formatDate(client.weddingDate)}</td>
      <td>${client.venue || "—"}</td>
      <td>${client.packageDetails || "—"}</td>
      <td><span class="status-badge ${statusClass}">${client.paymentStatus || "—"}</span></td>
      <td>${formatCurrency(client.advancePayment)}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-action="view" data-id="${client.id}">View</button>
          <button type="button" data-action="edit" data-id="${client.id}">Edit</button>
          <button type="button" data-action="delete" data-id="${client.id}" class="secondary">Delete</button>
        </div>
      </td>
    `;
    clientsTableBody.appendChild(row);

    if (clientsCardList) {
      const card = document.createElement("article");
      card.className = "client-card";
      card.dataset.id = client.id;
      card.innerHTML = `
        <header>
          <h3>${client.clientName || "—"}</h3>
          <span class="status-badge ${statusClass}">${client.paymentStatus || "—"}</span>
        </header>
        <div class="details">
          <div class="detail-block">
            <span class="detail-label">Wedding</span>
            <span class="detail-value">${formatDate(client.weddingDate)}</span>
          </div>
          <div class="detail-block">
            <span class="detail-label">Venue</span>
            <span class="detail-value">${client.venue || "—"}</span>
          </div>
          <div class="detail-block">
            <span class="detail-label">Package</span>
            <span class="detail-value">${client.packageDetails || "—"}</span>
          </div>
          <div class="detail-block">
            <span class="detail-label">Advance (INR)</span>
            <span class="detail-value">${formatCurrency(client.advancePayment)}</span>
          </div>
        </div>
        <footer>
          <button type="button" data-action="view" data-id="${client.id}">View</button>
          <button type="button" data-action="edit" data-id="${client.id}">Edit</button>
          <button type="button" data-action="delete" data-id="${client.id}" class="secondary">Delete</button>
        </footer>
      `;
      clientsCardList.appendChild(card);
    }
  }

  if (selectedClientId) {
    const stillExists = clients.some((client) => client.id === selectedClientId);
    if (!stillExists) {
      selectedClientId = null;
      clearDetailsPanel();
    }
  }

  markSelectedInLists();
}

function updateSummary() {
  if (!summaryTotalClients || !summaryUpcoming || !summaryPending || !summaryAdvance) {
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let upcomingCount = 0;
  let pendingCount = 0;
  let advanceTotal = 0;

  for (const client of clients) {
    if (client.weddingDate) {
      const date = new Date(client.weddingDate);
      if (!Number.isNaN(date.getTime()) && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        upcomingCount += 1;
      }
    }

    if (typeof client.paymentStatus === "string" && client.paymentStatus.toLowerCase() === "pending") {
      pendingCount += 1;
    }

    if (Number.isFinite(client.advancePayment)) {
      advanceTotal += client.advancePayment;
    }
  }

  summaryTotalClients.textContent = clients.length;
  summaryUpcoming.textContent = upcomingCount;
  summaryPending.textContent = pendingCount;
  summaryAdvance.textContent = clients.length ? formatCurrency(advanceTotal) : "—";
}

function markSelectedInLists() {
  clientsTableBody.querySelectorAll("tr.is-selected").forEach((row) => row.classList.remove("is-selected"));

  if (selectedClientId) {
    const activeRow = clientsTableBody.querySelector(`tr[data-id="${selectedClientId}"]`);
    activeRow?.classList.add("is-selected");
  }

  if (!clientsCardList) return;

  clientsCardList.querySelectorAll(".client-card.is-selected").forEach((card) => card.classList.remove("is-selected"));
  if (selectedClientId) {
    const activeCard = clientsCardList.querySelector(`.client-card[data-id="${selectedClientId}"]`);
    activeCard?.classList.add("is-selected");
  }
}

function handleTableActions(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  switch (action) {
    case "view":
      selectClient(id);
      break;
    case "edit":
      editClient(id);
      break;
    case "delete":
      deleteClient(id);
      break;
    default:
      break;
  }
}

function selectClient(id) {
  const client = clients.find((item) => item.id === id);
  if (!client) return;
  selectedClientId = id;

  detailsPanel.innerHTML = "<h2>Client Details</h2>";

  const fragment = detailsTemplate.content.cloneNode(true);
  fragment.querySelector('[data-field="clientName"]').textContent = client.clientName || "—";
  fragment.querySelector('[data-field="weddingDate"]').textContent = formatDate(client.weddingDate);
  fragment.querySelector('[data-field="venue"]').textContent = client.venue || "—";
  fragment.querySelector('[data-field="packageDetails"]').textContent = client.packageDetails || "—";
  fragment.querySelector('[data-field="deliverables"]').textContent = client.deliverables || "—";
  fragment.querySelector('[data-field="paymentInfo"]').textContent = client.paymentInfo || "—";
  fragment.querySelector('[data-field="advancePayment"]').textContent = formatCurrency(client.advancePayment);
  fragment.querySelector('[data-field="paymentStatus"]').textContent = client.paymentStatus || "—";

  const mapContainer = fragment.querySelector('[data-field="mapContainer"]');
  const embedUrl = buildMapEmbed(client.mapLink, client.venue);

  if (embedUrl) {
    mapContainer.innerHTML = `<iframe src="${embedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  } else {
    mapContainer.innerHTML = `<div class="map-placeholder">No map available</div>`;
  }

  detailsPanel.appendChild(fragment);
  markSelectedInLists();
}

function clearDetailsPanel() {
  detailsPanel.innerHTML = `<h2>Client Details</h2><p class="empty-state">Select a client to see quick details.</p>`;
}

function editClient(id) {
  const client = clients.find((item) => item.id === id);
  if (!client) return;

  clientForm.clientId.value = client.id;
  clientForm.clientName.value = client.clientName;
  clientForm.weddingDate.value = client.weddingDate;
  clientForm.venue.value = client.venue;
  clientForm.mapLink.value = client.mapLink;
  clientForm.packageDetails.value = client.packageDetails;
  clientForm.deliverables.value = client.deliverables;
  clientForm.paymentInfo.value = client.paymentInfo;
  clientForm.advancePayment.value =
    client.advancePayment !== undefined && client.advancePayment !== null ? client.advancePayment : "";
  clientForm.paymentStatus.value = client.paymentStatus;

  clientForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteClient(id) {
  const client = clients.find((item) => item.id === id);
  if (!client) return;

  const confirmDelete = confirm(`Delete client "${client.clientName}"? This cannot be undone.`);
  if (!confirmDelete) return;

  clients = clients.filter((item) => item.id !== id);
  saveClients();
  showToast("Client removed");
  renderClients();

  if (selectedClientId === id) {
    selectedClientId = null;
    clearDetailsPanel();
  }
}

function resetForm() {
  clientForm.reset();
  clientForm.clientId.value = "";
}

function handleAddClientShortcut() {
  resetForm();
  clientForm.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    clientForm.clientName.focus();
  }, 250);
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  try {
    if (!currencyFormatter) {
      currencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: "currency",
        currency: DEFAULT_CURRENCY,
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
    }
    return currencyFormatter.format(value);
  } catch (error) {
    console.warn("Failed to format currency value", error);
    return value.toFixed(2);
  }
}

function buildMapEmbed(mapLink, venue) {
  if (mapLink) {
    if (mapLink.includes("output=embed")) {
      return mapLink;
    }
    const separator = mapLink.includes("?") ? "&" : "?";
    return `${mapLink}${separator}output=embed`;
  }
  if (venue) {
    return `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;
  }
  return "";
}

function openReport(type) {
  const { title, entries } = buildReport(type);
  reportTitle.textContent = title;
  reportBody.innerHTML = "";

  if (!entries.length) {
    reportBody.innerHTML = `<p class="empty-report">No data available yet. Add clients with a wedding date to generate this report.</p>`;
  } else {
    for (const entry of entries) {
      const container = document.createElement("div");
      container.className = "report-entry";

      const summary = document.createElement("div");
      summary.className = "report-summary";

      const periodLabel = document.createElement("strong");
      periodLabel.textContent = entry.label;

      const totals = document.createElement("span");
      totals.textContent = `${entry.count} client${entry.count === 1 ? "" : "s"} · Advance ${formatCurrency(entry.advanceTotal)}`;

      summary.append(periodLabel, totals);
      container.appendChild(summary);

      if (entry.clients.length) {
        const list = document.createElement("ul");
        list.className = "report-client-list";

        for (const client of entry.clients) {
          const item = document.createElement("li");

          const header = document.createElement("div");
          header.className = "report-client-header";

          const nameSpan = document.createElement("span");
          nameSpan.className = "report-client-name";
          nameSpan.textContent = client.clientName || "—";

          const statusSpan = document.createElement("span");
          const statusClass = client.paymentStatus
            ? `status-${client.paymentStatus.replace(/\s+/g, "-").toLowerCase()}`
            : "";
          statusSpan.className = `status-badge ${statusClass}`.trim();
          statusSpan.textContent = client.paymentStatus || "—";

          header.append(nameSpan, statusSpan);

          const meta = document.createElement("div");
          meta.className = "report-client-meta";

          const weddingSpan = document.createElement("span");
          weddingSpan.textContent = `Wedding: ${formatDate(client.weddingDate)}`;

          const packageSpan = document.createElement("span");
          packageSpan.textContent = `Package: ${client.packageDetails || "—"}`;

          const advanceSpan = document.createElement("span");
          advanceSpan.textContent = `Advance: ${formatCurrency(client.advancePayment)}`;

          meta.append(weddingSpan, packageSpan, advanceSpan);

          item.append(header, meta);

          if (client.paymentInfo) {
            const paymentDetails = document.createElement("div");
            paymentDetails.className = "report-client-payment";
            paymentDetails.textContent = client.paymentInfo;
            item.appendChild(paymentDetails);
          }

          list.appendChild(item);
        }

        container.appendChild(list);
      }

      reportBody.appendChild(container);
    }
  }

  reportModal.removeAttribute("hidden");
}

function closeReport() {
  reportModal.setAttribute("hidden", "");
}

function buildReport(type) {
  const entriesMap = new Map();

  for (const client of clients) {
    if (!client.weddingDate) continue;
    const date = new Date(client.weddingDate);
    if (Number.isNaN(date.getTime())) continue;

    let key;
    let label;

    if (type === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    } else {
      key = `${date.getFullYear()}`;
      label = date.getFullYear().toString();
    }

    const existing =
      entriesMap.get(key) ??
      {
        label,
        clients: [],
        advanceTotal: 0,
      };

    existing.clients.push({
      id: client.id,
      clientName: client.clientName,
      weddingDate: client.weddingDate,
      paymentStatus: client.paymentStatus,
      advancePayment: client.advancePayment,
      paymentInfo: client.paymentInfo,
      packageDetails: client.packageDetails,
    });

    existing.advanceTotal += Number.isFinite(client.advancePayment) ? client.advancePayment : 0;
    entriesMap.set(key, existing);
  }

  const entries = Array.from(entriesMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, value]) => {
      value.clients.sort((a, b) => new Date(a.weddingDate) - new Date(b.weddingDate));
      return {
        ...value,
        count: value.clients.length,
      };
    });

  return {
    title: type === "monthly" ? "Monthly Wedding Report" : "Yearly Wedding Report",
    entries,
  };
}

function generateClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2300);
}

// Insert a minimal toast style block if not already present
if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 0.75rem 1.2rem;
      background: rgba(37, 99, 235, 0.95);
      color: #ffffff;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 200;
    }
    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
}

