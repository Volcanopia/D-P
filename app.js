let cards = [];
let darkMode = localStorage.getItem("darkMode") === "true";
const params = new URLSearchParams(location.search);
const shareCode = params.get("collection");

let sharedCards = null;
const readOnly = !!shareCode;
let displayGold = false;

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

// Id utilisateur
let userId = localStorage.getItem("userId");

// Génération du code de partage
function generateCode(length = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
}
localStorage.setItem("userId", userId);

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
            gold: saved?.gold ?? 0,
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

        // Recherche rapide des cartes existantes
        const existing = new Set(
            savedCards.map(c => `${c.extension}-${c.numero}`)
        );

        let modified = false;

        jsonCards.forEach(card => {

            const key = `${card.extension}-${card.numero}`;

            if (!existing.has(key)) {
                savedCards.push({
                    ...card,
                    quantite: 0,
                    gold: 0,
                    foil: false
                });

                modified = true;
            }
        });

        if (modified) {
            localStorage.setItem(
                "collection",
                JSON.stringify(savedCards)
            );
        }

        cards = savedCards;

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

function generateRecoveryCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 12; i++) {

        if (i > 0 && i % 4 === 0)
            code += "-";

        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

function getQuantity(card) {
    return displayGold ? card.gold : card.quantite;
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
            extensionCards.filter(c => getQuantity(c) > 0).length;

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
                getQuantity(card) === 0
                    ? "card grayscale " + card.extension
                    : "card " + card.extension;

            cardElement.innerHTML = `
                    ${displayGold ? `` : `<div class="foil-star ${card.gold > 0 ? 'active' : ''}"
                onclick="toggleFoil('${card.numero}','${card.extension}')">
                ★
            </div>`}

                <img src="${card.image}" alt="${card.nom}">

                <div class="card-info">

                    <div class="card-number">
                        N°${card.numero}
                    </div>

                    <div class="quantity-controls">
${readOnly
                    ? `<span class="quantity ${displayGold ? "gold" : ""}">Qté: ${displayGold ? card.gold : card.quantite}<span/>`
                    : `<button class="minus-btn ${card.extension}button"
    ${getQuantity(card) === 0 ? "disabled" : ""}
    onclick="changeQuantity('${card.numero}','${card.extension}', -1)">
    -
</button>

                        <span class="quantity ${displayGold ? "gold" : ""}">
                            ${getQuantity(card)}
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
            extensionCards.filter(c => getQuantity(c) > 0).length;

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

    displayGold ? card.gold += delta : card.quantite += delta;

    if (card.quantite < 0) {
        card.quantite = 0;
    }
    if (card.gold < 0) {
        card.gold = 0;
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

function loadLocalData(jsonCards) {

    const saved = localStorage.getItem("collection");

    if (!saved) {
        cards = jsonCards.map(c => ({
            ...c,
            quantite: 0,
            gold: 0,
            foil: false
        }));

        saveLocalData();
        return false;
    }

    const savedCards = JSON.parse(saved);

    const map = Object.fromEntries(
        savedCards.map(c => [`${c.extension}-${c.numero}`, c])
    );

    let modified = false;

    cards = jsonCards.map(card => {

        const key = `${card.extension}-${card.numero}`;
        const saved = map[key];

        const merged = {
            ...card,
            quantite: saved?.quantite ?? 0,
            gold: saved?.gold ?? 0,
            foil: saved?.foil ?? false
        };

        // 🔥 migration automatique si champ manquant
        if (!saved) modified = true;
        if (saved && saved.gold === undefined) modified = true;

        return merged;
    });

    if (modified) {
        saveLocalData();
    }

    return true;
}

function getActiveCards() {
    if (readOnly && sharedCards) return sharedCards;
    return cards;
}

filter.addEventListener("change", renderCards);

// Publication de la collection
async function publishCollection() {
    if (readOnly)
        return;

    console.log("Publication...");

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
    let recovery_code;
    console.log("owner_id = " + owner_id);
    console.log("payload size = " + payload.length);
    if (existing) {

        share_code = existing.share_code;
        recovery_code = existing.recovery_code;

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
        recovery_code = generateRecoveryCode();

        const { error } = await supabase
            .from("collections")
            .insert({
                owner_id,
                share_code,
                recovery_code,
                cards: payload
            });
        console.log(JSON.stringify({ error }));
        if (error) {
            debug(error.message);
            return;
        }
    }

    const link = `${location.origin}/D-P/?collection=${share_code}`;

    const box = document.getElementById("shareBox");
    const input = document.getElementById("shareLink");
    const recovery = document.getElementById("recovery");
    recovery.textContent = recovery_code;

    input.value = link;
    box.style.display = "block";

    debug("Collection publiée");
    debug(link);
}

// Récupération de la collection
async function restoreCollection() {
    if (readOnly) return;

    const recoveryCode = document
        .getElementById("recoveryCode")
        .value
        .trim()
        .toUpperCase();

    if (!recoveryCode) {
        alert("Veuillez saisir votre code de récupération.");
        return;
    }

    const { data, error } = await supabase.rpc("restore_collection", {
        p_recovery_code: recoveryCode
    });

    if (error || !data || !data.length) {
        alert("Code de récupération invalide.");
        return;
    }

    const row = data[0];

    localStorage.setItem("userId", row.owner_id);
    localStorage.setItem("collection", JSON.stringify(row.cards));

    alert("Collection restaurée avec succès.");

    location.href = location.pathname;
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

    loadLocalData(jsonCards);
    loadExtensions();
    renderStats();
    renderCards();

})();

window.addEventListener("DOMContentLoaded", () => {

    const darkModeBtn = document.getElementById("darkModeBtn");

    if (darkMode) {
        document.body.classList.add("dark-mode");
        darkModeBtn.textContent = "☀️ Mode clair";
    }
    darkModeBtn.addEventListener("click", () => {

    darkMode = !darkMode;

    document.body.classList.toggle("dark-mode", darkMode);

    localStorage.setItem("darkMode", darkMode);

    darkModeBtn.textContent = darkMode
        ? "☀️ Mode clair"
        : "🌙 Mode sombre";
});
    // Options
    const dialog = document.getElementById("optionsDialog");

    document.getElementById("optionsBtn").addEventListener("click", () => {
        dialog.showModal();
    });

    document.getElementById("closeOptionsBtn").addEventListener("click", () => {
        dialog.close();
    });

    const restoreBtn = document.getElementById("restoreBtn");

    restoreBtn.addEventListener("click", restoreCollection);

    // const filter = document.getElementById("extensionFilter");
    const publishButton = document.getElementById("publishBtn");
    const copyBtn = document.getElementById("copyLinkBtn");
    const copyRecoveryBtn = document.getElementById("copyRecoveryCode");
    const backBtn = document.getElementById("backBtn");
    const toggleGoldBtn = document.getElementById("toggleGoldBtn");

    toggleGoldBtn.addEventListener("click", () => {

        displayGold = !displayGold;

        document.body.classList.toggle("gold-mode", displayGold);
        displayGold ? toggleGoldBtn.classList.add('active') : toggleGoldBtn.classList.remove('active');
        renderStats();
        renderCards();

    });

    backBtn.addEventListener("click", () => {
        // enlève le paramètre URL
        const url = new URL(window.location.href);
        url.searchParams.delete("collection");

        window.location.href = url.toString();
    });

    // filter.addEventListener("change", renderCards);
    if (readOnly) {
        backBtn.style.display = "block";
        publishButton.style.display = "none";
        document.getElementsByTagName("h1")[0].textContent = `Collection partagée`;
    } else {
        publishButton.addEventListener("click", publishCollection);
    }

    copyBtn.addEventListener("click", async () => {
        const input = document.getElementById("shareLink");

        try {
            await navigator.clipboard.writeText(input.value);
            debug("Lien copié !");
        } catch (e) {
            debug("Erreur copie : " + e.message);
        }
    });
    copyRecoveryBtn.addEventListener("click", async () => {
        const input = document.getElementById("recovery");

        try {
            await navigator.clipboard.writeText(input.textContent);
            debug("Lien copié !");
        } catch (e) {
            debug("Erreur copie : " + e.message);
        }
    });

});