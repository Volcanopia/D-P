const readOnly = new URLSearchParams(location.search).has("collection");
const container = document.getElementById("cardsContainer");
const filter = document.getElementById("extensionFilter");
const statsContainer = document.getElementById("statsContainer");

// Fonction debug
function debug(value) {

    const div = document.getElementById("debug");

    if (!div) return;

    try {

        div.innerHTML += `<pre>${typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : value
            }</pre>`;

    } catch {

        div.innerHTML += `<pre>${String(value)}</pre>`;

    }
}

// Appel à supabase
try {

    supabase = window.supabase.createClient(
        "https://qqxlonawpcahvztvsskd.supabase.co",
        "sb_publishable_ovMNqNx-sjcybaUKDCTdUg_HanedBW6"
    );
} catch (e) {
    debug("Erreur createClient");
    debug(e.message);
    debug(e.stack);
}

// Initialisation des cartes
let cards = [];          // Référentiel
let myCollection = {};   // LocalStorage
let sharedCollection = null; // Collection consultée

function getDisplayedCards() {

    const collection = readOnly
        ? sharedCollection
        : myCollection;

    return cards.map(card => ({
        ...card,
        quantite: collection?.[card.numero]?.quantite ?? 0,
        foil: collection?.[card.numero]?.foil ?? false
    }));
}

// Id utilisateur
let userId = localStorage.getItem("userId");

if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
}
localStorage.setItem("userId", userId);

// Génération du code de partage
function generateCode(length = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Publication de la collection
async function publishCollection() {

    debug("Publication...");

    const owner_id = localStorage.getItem("userId");

    if (!owner_id) {
        debug("No owner_id");
        return;
    }

    const payload = Object.values(myCollection);
    //debug(payload);
    // 1. Vérifier si déjà existant
    const { data: existing } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", owner_id)
        .maybeSingle();

    let share_code;

    if (existing) {

        share_code = existing.share_code;

        const { error } = await supabase
            .from("collections")
            .update({
                cards: payload,
                updated_at: new Date()
            })
            .eq("owner_id", owner_id);

        if (error) {
            debug(error.message);
            return;
        }

    } else {

        share_code = generateCode();

        const { error } = await supabase
            .from("collections")
            .insert({
                owner_id,
                share_code,
                cards: payload
            });

        if (error) {
            debug(error.message);
            return;
        }
    }

    const link = `${location.origin}?collection=${share_code}`;

    const box = document.getElementById("shareBox");
    const input = document.getElementById("shareLink");

    input.value = link;
    box.style.display = "block";

    debug("Collection publiée");
    debug(link);
}

// Chargement des cartes
async function loadCards() {

    const response = await fetch("cards.json");
    const jsonCards = await response.json();

    const saved = JSON.parse(localStorage.getItem("collection") || "[]");

    cards = jsonCards;
    myCollection = saved;

    loadExtensions();
    renderStats();
    renderCards();
}

// Chargement des extensions
function loadExtensions() {
    const displayedCards = getDisplayedCards();

    const extensions = [...new Set(displayedCards.map(c => c.extension))];

    extensions.sort().forEach(extension => {
        const option = document.createElement("option");
        option.value = extension;
        option.textContent = `Extension ${extension}`;
        filter.appendChild(option);
    });
}

// Affichage des cartes
function renderCards() {
    const selectedExtension = filter.value;

    const displayedCards = getDisplayedCards();

    let filteredCards = displayedCards;

    if (selectedExtension !== "all") {
        filteredCards = displayedCards.filter(
            card => card.extension === selectedExtension
        );
    }

    container.innerHTML = "";

    filteredCards.forEach(card => {

        const cardElement = document.createElement("div");

        cardElement.className =
            card.quantite === 0
                ? "card grayscale " + card.extension
                : "card " + card.extension

        cardElement.innerHTML = `
            <img src="${card.image}" alt="${card.nom}">

            <div class="card-info">
                <div class="card-number">
                    N° ${card.numero}
                </div>

                <div class="card-extension">
${card.extension}
                </div>

                <div class="quantity-controls">
                ${readOnly
                ? `<span class="quantity">Possédée: ${card.quantite}<span/>`
                : `<button class="minus-btn ${card.extension}button"
    ${card.quantite === 0 ? 'disabled' : ''}
    onclick="changeQuantity('${card.numero}', -1)">
    -
</button>

                    <span class="quantity">
                        ${card.quantite}
                    </span>

                    <button class="${card.extension}button" onclick="changeQuantity('${card.numero}', 1)">
                        +
                    </button>`
            }
                </div>
            </div>
        `;

        container.appendChild(cardElement);
    });
}

// Affichage de stats de complétion
function renderStats() {

    const displayedCards = getDisplayedCards();

    const extensions = [...new Set(displayedCards.map(c => c.extension))]

    statsContainer.innerHTML = "";

    extensions.forEach(extension => {

        const extensionCards =
            displayedCards.filter(c => c.extension === extension);

        const total =
            extensionCards.length;

        const obtained =
            extensionCards.filter(c => c.quantite > 0).length;

        const percent =
            Math.round((obtained / total) * 100);

        const stat = document.createElement("div");

        stat.className = "extension-stat";

        stat.textContent =
            `${extension} : ${obtained}/${total} (${percent}%)`;

        statsContainer.appendChild(stat);
    });
}
function saveLocalData() {
    localStorage.setItem(
        "collection",
        JSON.stringify(myCollection)
    );
}
// Modification de la quantité d'une carte
function changeQuantity(numero, delta) {
    if (readOnly) return;
    if (!myCollection[numero]) {
        myCollection[numero] = {
            numero,
            quantite: 0,
            foil: false
        };
    }

    myCollection[numero].quantite += delta;

    if (myCollection[numero].quantite < 0) {
        myCollection[numero].quantite = 0;
    }

    saveLocalData();
    renderStats();
    renderCards();
}

// Sauvegarde des données en local
localStorage.setItem(
    "collection",
    JSON.stringify(myCollection)
);

// Chargement des données partagées
async function loadSharedCollection() {

    debug("Récupération de la collection");

    const params = new URLSearchParams(location.search);
    const code = params.get("collection");

    if (!code) return false;

    const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("share_code", code)
        .maybeSingle();

    if (error || !data) {
        debug("Collection introuvable");
        return false;
    }

    // Chargement du référentiel complet
    const response = await fetch("cards.json");
    const jsonCards = await response.json();

    // Création d'un index des données sauvegardées
    const savedCards = Object.fromEntries(
        data.cards.map(card => [
            card.numero,
            card
        ])
    );

    cards = jsonCards;
    sharedCollection = savedCards;

    loadExtensions();
    renderStats();
    renderCards();

    debug("Collection chargée en lecture seule");

    return true;
}


filter.addEventListener("change", renderCards);
document
    .getElementById("publishBtn")
    .addEventListener("click", publishCollection);
document.getElementById("copyLinkBtn").addEventListener("click", async () => {

    const input = document.getElementById("shareLink");

    try {
        await navigator.clipboard.writeText(input.value);
        debug("Lien copié !");
    } catch (e) {
        debug("Erreur copie : " + e.message);
    }
});

(async () => {

    if (await loadSharedCollection()) {
        return; // mode lecture seule
    }

    await loadCards();
})();