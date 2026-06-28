let cards = [];
const params = new URLSearchParams(location.search);
const shareCode = params.get("collection");

let sharedCards = null;
const readOnly = !!shareCode;

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

const extensionNames = {
    S1: "L'Aventure",
    S2: "Découvertes magiques",
    S3: "L'Éveil d'Emral",
    // S4: "???",
    // S5: "???",
    // S6: "???",
    // S7: "???",
    // MS1: "???",
}
const container = document.getElementById("cardsContainer");
const filter = document.getElementById("extensionFilter");
const statsContainer = document.getElementById("statsContainer");

async function loadSharedCollection(jsonCards) {
    if (!shareCode) return false;

    const { data, error } = await supabase.rpc("get_collection", {
        p_share_code: shareCode
    });

    if (error || !data || !data.length) {
        console.error("Collection introuvable");
        return false;
    }

    const row = data[0];

    sharedCards = jsonCards.map(card => {
        const saved = row.cards.find(c =>
            c.extension === card.extension &&
            c.numero === card.numero
        );

        return {
            ...card,
            quantite: saved?.quantite ?? 0,
            foil: saved?.foil ?? false
        };
    });

    loadExtensions();
    return true;
}

async function loadCards() {
    const response = await fetch("cards.json");
    const jsonCards = await response.json();

    const saved = localStorage.getItem("collection");

    if (saved) {
        const savedCards = JSON.parse(saved);

        const quantities = Object.fromEntries(
            savedCards.map(card => [
                card.numero,
                card.quantite
            ])
        );

        cards = jsonCards.map(card => ({
            ...card,
            quantite: quantities[card.numero] ?? card.quantite
        }));
    } else {
        cards = jsonCards;
    }

    loadExtensions();
    renderStats();
    renderCards();
}
function loadExtensions() {

    filter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Toutes les extensions";
    filter.appendChild(allOption);

    const source = getActiveCards();

    const extensions = [...new Set(source.map(c => c.extension))]
        .sort();

    extensions.forEach(extension => {

        const option = document.createElement("option");

        option.value = extension;

        option.textContent = extensionNames[extension]
            ? `${extension} - ${extensionNames[extension]}`
            : extension;

        filter.appendChild(option);
    });
}

function renderCards() {

    const selectedExtension = filter.value;
    container.innerHTML = "";

    const source = getActiveCards();

    const extensions = [...new Set(source.map(c => c.extension))]
        .sort();

    extensions.forEach(extension => {

        if (
            selectedExtension !== "all" &&
            extension !== selectedExtension
        ) {
            return;
        }

        const extensionCards =
            source.filter(c => c.extension === extension);

        const obtained =
            extensionCards.filter(c => c.quantite > 0).length;

        const total =
            extensionCards.length;

        const section = document.createElement("section");
        section.className = "extension-section";

        section.innerHTML = `
            <div class="extension-header">
                <h2>
                    ${extension}
                    ${extensionNames[extension]
                ? ` - ${extensionNames[extension]}`
                : ""
            }
                </h2>

                <div class="extension-progress">
                    ${obtained}/${total}
                    (${Math.round(obtained * 100 / total)}%)
                </div>
            </div>

            <div class="cards-grid"></div>
        `;

        const grid =
            section.querySelector(".cards-grid");

        extensionCards.forEach(card => {

            const cardElement =
                document.createElement("div");

            cardElement.className =
                card.quantite === 0
                    ? "card grayscale " + card.extension
                    : "card " + card.extension;

            cardElement.innerHTML = `
                    <div class="foil-star ${card.foil ? 'active' : ''}"
                onclick="toggleFoil('${card.numero}','${card.extension}')">
                ★
            </div>

                <img src="${card.image}" alt="${card.nom}">

                <div class="card-info">

                    <div class="card-number">
                        N°${card.numero}
                    </div>

                    <div class="quantity-controls">
${readOnly
                    ? `<span class="quantity">Qté: ${card.quantite}<span/>`
                    : `<button class="minus-btn ${card.extension}button"
    ${card.quantite === 0 ? 'disabled' : ''}
    onclick="changeQuantity('${card.numero}','${card.extension}', -1)">
    -
</button>

                        <span class="quantity">
                            ${card.quantite}
                        </span>

                        <button class="${card.extension}button" onclick="changeQuantity('${card.numero}','${card.extension}', 1)">
                        +
                    </button>`}
                        

                    </div>

                </div>
            `;

            grid.appendChild(cardElement);

        });

        container.appendChild(section);

    });
}

function renderStats() {

    const source = getActiveCards();

    const extensions = [...new Set(source.map(c => c.extension))]
        .sort();

    statsContainer.innerHTML = "";

    extensions.forEach(extension => {

        const extensionCards =
            source.filter(c => c.extension === extension);

        const total = extensionCards.length;

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

function toggleFoil(numero, extension) {
    if (readOnly) return;
    const card = cards.find(
        c => c.numero === numero && c.extension === extension
    );

    if (!card) return;

    card.foil = !card.foil;

    saveLocalData();
    renderCards();
}

function changeQuantity(numero, extension, delta) {
    if (readOnly) return;
    const card = cards.find(c => c.numero === numero && c.extension === extension);
    if (!card) return;

    card.quantite += delta;

    if (card.quantite < 0) {
        card.quantite = 0;
    }

    saveLocalData();
    renderStats();
    renderCards();
}

function saveLocalData() {
    localStorage.setItem(
        "collection",
        JSON.stringify(cards)
    );
}

function loadLocalData() {

    const saved = localStorage.getItem("collection");
    if (saved) {
        cards = JSON.parse(saved);
        loadExtensions();
        renderStats();
        renderCards();
        return true;
    }

    return false;
}

function getActiveCards() {
    if (readOnly && sharedCards) return sharedCards;
    return cards;
}

filter.addEventListener("change", renderCards);
const publishButton = document.getElementById("publishBtn");
if (readOnly)
    publishButton.style.display = "none";
else
    publishButton.addEventListener("click", publishCollection);
document.getElementById("copyLinkBtn").addEventListener("click", async () => {

    const input = document.getElementById("shareLink");

    try {
        await navigator.clipboard.writeText(input.value);
        debug("Lien copié !");
    } catch (e) {
        debug("Erreur copie : " + e.message);
    }
});

// Publication de la collection
async function publishCollection() {
    if (readOnly)
        return;

    debug("Publication...");

    const owner_id = localStorage.getItem("userId");

    if (!owner_id) {
        debug("No owner_id");
        return;
    }

    const payload = Object.values(cards);
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

(async () => {

    const response = await fetch("cards.json");
    const jsonCards = await response.json();

    cards = jsonCards; // base toujours disponible

    if (await loadSharedCollection(jsonCards)) {
        renderStats();
        renderCards();
        return;
    }

    loadLocalData();
    renderStats();
    renderCards();

})();