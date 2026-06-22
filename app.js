let cards = [];

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

    const extensions = [...new Set(cards.map(c => c.extension))]
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

    const extensions = [...new Set(cards.map(c => c.extension))]
        .sort();

    extensions.forEach(extension => {

        if (
            selectedExtension !== "all" &&
            extension !== selectedExtension
        ) {
            return;
        }

        const extensionCards =
            cards.filter(c => c.extension === extension);

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
                <img src="${card.image}" alt="${card.nom}">

                <div class="card-info">

                    <div class="card-number">
                        N°${card.numero}
                    </div>

                    <div class="quantity-controls">

                        <button class="minus-btn ${card.extension}button"
    ${card.quantite === 0 ? 'disabled' : ''}
    onclick="changeQuantity('${card.numero}','${card.extension}', -1)">
    -
</button>

                        <span class="quantity">
                            ${card.quantite}
                        </span>

                        <button class="${card.extension}button" onclick="changeQuantity('${card.numero}','${card.extension}', 1)">
                        +
                    </button>

                    </div>

                </div>
            `;

            grid.appendChild(cardElement);

        });

        container.appendChild(section);

    });
}

function renderStats() {

    const extensions = [...new Set(cards.map(c => c.extension))]
        .sort();

    statsContainer.innerHTML = "";

    extensions.forEach(extension => {

        const extensionCards =
            cards.filter(c => c.extension === extension);

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

function changeQuantity(numero, extension , delta) {

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

filter.addEventListener("change", renderCards);

(async () => {
    if (loadLocalData()) { return; }
    await loadCards();
})();