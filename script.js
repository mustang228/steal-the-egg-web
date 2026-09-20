const API_URL = "https://steal-the-egg-web.onrender.com";

const tg = window.Telegram?.WebApp;

const state = {
    user: null,
    data: null,
    eggTab: "chests"
};

const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(
    /[&<>"']/g,
    c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c])
);


/* =========================
   API
========================= */

function headers() {
    return {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg?.initData || ""
    };
}


async function api(url, options = {}) {

    const r = await fetch(`${API_URL}${url}`, {
        ...options,

        headers: {
            ...headers(),
            ...(options.headers || {})
        }
    });

    const d = await r.json().catch(() => ({
        ok: false,
        error: "Ошибка сервера"
    }));

    if (!r.ok || d.ok === false) {
        throw Error(d.error || "Ошибка");
    }

    return d;
}


/* =========================
   TOAST
========================= */

function toast(t) {

    const e = $("toast");

    if (!e) return;

    e.textContent = t;

    e.classList.add("show");

    clearTimeout(window.tt);

    window.tt = setTimeout(() => {
        e.classList.remove("show");
    }, 2200);
}


/* =========================
   НАВИГАЦИЯ
========================= */

function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(x => {
            x.classList.toggle(
                "active",
                x.id === page
            );
        });

    document
        .querySelectorAll("[data-page]")
        .forEach(x => {
            x.classList.toggle(
                "active",
                x.dataset.page === page
            );
        });

    window.scrollTo(0, 0);

    if (page === "eggs") {
        loadEggs();
    }
}


/* =========================
   DATA
========================= */

function setData(d) {

    if (!d) return;

    state.data = d;


    /* =========================
       БАЛАНСЫ
    ========================= */

    if ($("tapCoins")) {
        $("tapCoins").textContent =
            Number(d.tap_coins || 0).toLocaleString();
    }

    if ($("eggCoins")) {
        $("eggCoins").textContent =
            Number(d.egg_coins || 0).toLocaleString();
    }


    /* =========================
       СЕРИЯ
    ========================= */

    if ($("streak")) {
        $("streak").textContent =
            Number(d.streak || 0);
    }


    /* =========================
       LEVEL / XP
    ========================= */

    if ($("level")) {
        $("level").textContent =
            Number(d.level || 1);
    }

    const xp = Number(d.xp || 0);

    const xpRequired =
        Number(
            d.xp_required ||
            ((Number(d.level || 1)) * 100)
        );

    if ($("xpText")) {
        $("xpText").textContent =
            `${xp}/${xpRequired} XP`;
    }

    if ($("xpBar")) {

        let progress = 0;

        if (xpRequired > 0) {
            progress =
                Math.min(
                    100,
                    (xp / xpRequired) * 100
                );
        }

        $("xpBar").style.width =
            progress + "%";
    }


    /* =========================
       PROFILE
    ========================= */

    const firstName =
        state.user?.first_name || "Игрок";

    if ($("profileName")) {
        $("profileName").textContent =
            firstName;
    }

    if ($("profileId")) {
        $("profileId").textContent =
            `ID: ${state.user?.id || "—"}`;
    }

    if ($("profileTap")) {
        $("profileTap").textContent =
            Number(d.tap_coins || 0).toLocaleString();
    }

    if ($("profileEgg")) {
        $("profileEgg").textContent =
            Number(d.egg_coins || 0).toLocaleString();
    }


    /* =========================
       ЯЙЦА
    ========================= */

    let eggsTotal =
        Number(d.eggs_total || 0);

    if (
        !eggsTotal &&
        d.eggs &&
        typeof d.eggs === "object"
    ) {

        eggsTotal =
            Object.values(d.eggs)
                .reduce(
                    (sum, value) =>
                        sum + Number(value || 0),
                    0
                );
    }

    if ($("profileEggs")) {
        $("profileEggs").textContent =
            eggsTotal;
    }


    /* =========================
       ДОСТИЖЕНИЯ
    ========================= */

    if ($("profileAch")) {

        $("profileAch").textContent =
            Array.isArray(d.achievements)
                ? d.achievements.length
                : Number(d.achievements_count || 0);
    }


    /* =========================
       AVATAR
    ========================= */

    if ($("avatarButton")) {
        $("avatarButton").textContent =
            d.avatar || "🥚";
    }

    if ($("profileAvatar")) {
        $("profileAvatar").textContent =
            d.avatar || "🥚";
    }
}


/* =========================
   INIT
========================= */

async function init() {

    if (tg) {
        tg.ready();
        tg.expand();
    }

    try {

        const r = await api(
            "/api/init",
            {
                method: "POST",
                body: "{}"
            }
        );

        state.user = r.user;

        setData(r.data);

        if ($("username")) {

            $("username").textContent =
                state.user.username
                    ? "@" + state.user.username
                    : state.user.first_name || "Игрок";
        }

        if ($("app")) {
            $("app").classList.remove("hidden");
        }

        if (r.login?.claimed) {

            toast(
                `🔥 Серия ${r.login.streak} дней · +${r.login.reward} Egg Coins`
            );
        }

        (r.new_achievements || [])
            .forEach(a => {

                setTimeout(() => {

                    toast(
                        `🏆 ${a.name} · +${a.reward} Egg Coins`
                    );

                }, 700);
            });

    } catch (e) {

        if ($("app")) {
            $("app").classList.remove("hidden");
        }

        if ($("username")) {
            $("username").textContent =
                "Открой приложение через Telegram";
        }

        toast(e.message);
    }
}


/* =========================
   НАВИГАЦИЯ
========================= */

document.addEventListener("click", e => {

    const p =
        e.target.closest("[data-page]");

    if (p) {
        showPage(
            p.dataset.page
        );
    }
});


/* =========================
   ТАПАЛКА
========================= */

if ($("eggTap")) {

    $("eggTap").onclick = async e => {

        const b = e.currentTarget;

        const rect =
            b.getBoundingClientRect();

        const f =
            document.createElement("div");

        f.className = "floater";

        f.textContent = "+1";

        f.style.left =
            (
                rect.left +
                rect.width / 2 -
                10
            ) + "px";

        f.style.top =
            (rect.top + 40) + "px";

        if ($("tapFloaters")) {
            $("tapFloaters").appendChild(f);
        }

        setTimeout(() => {
            f.remove();
        }, 800);

        if (tg?.HapticFeedback) {

            tg.HapticFeedback
                .impactOccurred("light");
        }

        try {

            const r = await api(
                "/api/tap",
                {
                    method: "POST",
                    body: JSON.stringify({
                        amount: 1
                    })
                }
            );

            setData(r.data);

            (r.new_achievements || [])
                .forEach(a => {

                    toast(
                        `🏆 ${a.name} · +${a.reward}`
                    );
                });

        } catch (e) {

            toast(e.message);
        }
    };
}


/* =========================
   ОБМЕН TAP COINS
========================= */

if ($("exchangeBtn")) {

    $("exchangeBtn").onclick = async () => {

        if (
            !state.data ||
            Number(state.data.tap_coins || 0) < 30
        ) {

            toast(
                "Нужно минимум 30 Tap Coins"
            );

            return;
        }

        try {

            const r =
                await api(
                    "/api/exchange",
                    {
                        method: "POST",
                        body: "{}"
                    }
                );

            setData(r.data);

            toast(
                `🥚 +${r.received} Egg Coins`
            );

        } catch (e) {

            toast(e.message);
        }
    };
}


/* =========================
   УГАДАЙ ЧИСЛО
========================= */

if ($("guessBtn")) {

    $("guessBtn").onclick = async () => {

        try {

            await api(
                "/api/game/guess/start",
                {
                    method: "POST",
                    body: "{}"
                }
            );

            $("gameArea").innerHTML = `

                <h3>
                    🔢 Угадай число
                </h3>

                <p>
                    Число от 1 до 20 · 10 попыток
                </p>

                <input
                    id="guessInput"
                    class="input"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Твоё число"
                >

                <button
                    id="guessSend"
                    class="primary"
                    type="button"
                >
                    Ответить
                </button>

                <p id="guessInfo"></p>
            `;

            $("guessSend").onclick =
                async () => {

                    const input =
                        $("guessInput");

                    const guess =
                        Number(input.value);

                    if (
                        !Number.isInteger(guess) ||
                        guess < 1 ||
                        guess > 20
                    ) {

                        toast(
                            "Введи число от 1 до 20"
                        );

                        return;
                    }

                    try {

                        const r =
                            await api(
                                "/api/game/guess/answer",
                                {
                                    method: "POST",

                                    body:
                                        JSON.stringify({
                                            guess
                                        })
                                }
                            );

                        if (
                            r.result ===
                            "continue"
                        ) {

                            $("guessInfo")
                                .textContent =
                                `❌ ${r.hint} · ${r.attempts}/10`;

                            input.value = "";

                            input.focus();

                            return;
                        }

                        setData(r.data);

                        $("gameArea").innerHTML = `

                            <h3>
                                ${
                                    r.result === "win"
                                        ? "🎉 Победа!"
                                        : "❌ Игра окончена"
                                }
                            </h3>

                            <p>
                                Загаданное число:
                                <b>${r.number}</b>
                            </p>

                            <p>
                                Награда:
                                +${r.reward} Egg Coins
                            </p>

                            <button
                                id="guessAgain"
                                class="primary"
                                type="button"
                            >
                                🔄 Играть ещё
                            </button>
                        `;

                        $("guessAgain").onclick =
                            () => $("guessBtn").click();

                    } catch (e) {

                        toast(e.message);
                    }
                };

        } catch (e) {

            toast(e.message);
        }
    };
}


/* =========================
   МАТЕМАТИКА
========================= */

async function startMathGame() {

    try {

        const r =
            await api(
                "/api/game/math/start",
                {
                    method: "POST",
                    body: "{}"
                }
            );

        renderMathQuestion(
            r.question
        );

    } catch (e) {

        toast(e.message);
    }
}


function renderMathQuestion(question) {

    $("gameArea").innerHTML = `

        <h3>
            🧠 Математика
        </h3>

        <div class="boss-hp">
            ${esc(question)}
        </div>

        <input
            id="mathInput"
            class="input"
            type="number"
            placeholder="Ответ"
        >

        <button
            id="mathSend"
            class="primary"
            type="button"
        >
            Проверить
        </button>

        <p id="mathInfo"></p>
    `;

    $("mathSend").onclick =
        async () => {

            const value =
                $("mathInput").value;

            if (value === "") {

                toast(
                    "Введи ответ"
                );

                return;
            }

            try {

                const x =
                    await api(
                        "/api/game/math/answer",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    answer:
                                        Number(value)
                                })
                        }
                    );

                setData(x.data);

                if (x.result === "win") {

                    $("gameArea").innerHTML = `

                        <h3>
                            🎉 Правильно!
                        </h3>

                        <p>
                            Ответ:
                            <b>${x.correct}</b>
                        </p>

                        <p>
                            Награда:
                            +${x.reward} Egg Coins
                        </p>

                        <button
                            id="mathNext"
                            class="primary"
                            type="button"
                        >
                            ➡️ Следующий пример
                        </button>
                    `;

                    $("mathNext").onclick =
                        startMathGame;

                    return;
                }

                renderMathQuestion(
                    x.question
                );

                toast(
                    `❌ Неправильно. Правильный ответ: ${x.correct}`
                );

            } catch (e) {

                toast(e.message);
            }
        };
}


if ($("mathBtn")) {

    $("mathBtn").onclick =
        startMathGame;
}


/* =========================
   КРЕСТИКИ-НОЛИКИ
========================= */

let ticBusy = false;


function renderTic(board) {

    const safeBoard =
        Array(9).fill("");


    if (Array.isArray(board)) {

        for (
            let i = 0;
            i < Math.min(board.length, 9);
            i++
        ) {

            safeBoard[i] =
                board[i] ?? "";
        }
    }


    $("gameArea").innerHTML = `

        <h3>
            ❌⭕ Крестики-нолики
        </h3>

        <div class="tic">

            ${safeBoard.map((v, i) => `

                <button
                    class="tic-cell"
                    data-cell="${i}"
                    type="button"
                    ${v !== "" ? "disabled" : ""}
                >
                    ${
                        v === ""
                            ? "⬜"
                            : esc(v)
                    }
                </button>

            `).join("")}

        </div>

        <p>
            Ты играешь за ❌
        </p>
    `;


    document
        .querySelectorAll("[data-cell]")
        .forEach(button => {

            button.onclick =
                async () => {

                    if (ticBusy) {
                        return;
                    }

                    const index =
                        Number(
                            button.dataset.cell
                        );

                    if (
                        !Number.isInteger(index) ||
                        index < 0 ||
                        index > 8
                    ) {
                        return;
                    }

                    ticBusy = true;

                    document
                        .querySelectorAll("[data-cell]")
                        .forEach(x => {
                            x.disabled = true;
                        });

                    try {

                        const r =
                            await api(
                                "/api/game/tic/move",
                                {
                                    method: "POST",

                                    body:
                                        JSON.stringify({
                                            index
                                        })
                                }
                            );


                        /*
                         * Игра продолжается.
                         */
                        if (
                            r.result ===
                            "continue"
                        ) {

                            renderTic(
                                r.board
                            );

                            ticBusy = false;

                            return;
                        }


                        /*
                         * Игра закончилась.
                         */
                        if (r.data) {
                            setData(
                                r.data
                            );
                        }


                        let title =
                            "❌ Поражение";

                        if (
                            r.result ===
                            "win"
                        ) {

                            title =
                                "🎉 Победа!";

                        } else if (
                            r.result ===
                            "draw"
                        ) {

                            title =
                                "🤝 Ничья!";
                        }


                        $("gameArea").innerHTML = `

                            <h3>
                                ${title}
                            </h3>

                            <div class="tic">

                                ${
                                    Array.isArray(r.board)
                                        ? r.board
                                            .slice(0, 9)
                                            .map(cell => `
                                                <button
                                                    class="tic-cell"
                                                    type="button"
                                                    disabled
                                                >
                                                    ${
                                                        cell === "X"
                                                            ? "❌"
                                                            : cell === "O"
                                                                ? "⭕"
                                                                : "⬜"
                                                    }
                                                </button>
                                            `)
                                            .join("")
                                        : ""
                                }

                            </div>

                            <p>
                                Награда:
                                +${r.reward || 0}
                                Egg Coins
                            </p>

                            <button
                                id="ticAgain"
                                class="primary"
                                type="button"
                            >
                                🔄 Играть ещё
                            </button>
                        `;


                        if ($("ticAgain")) {

                            $("ticAgain").onclick =
                                () => {

                                    ticBusy = false;

                                    if ($("ticBtn")) {
                                        $("ticBtn").click();
                                    }
                                };
                        }


                    } catch (e) {

                        ticBusy = false;

                        toast(e.message);

                        /*
                         * После ошибки снова разрешаем
                         * только свободные клетки.
                         */
                        document
                            .querySelectorAll("[data-cell]")
                            .forEach(x => {
                                x.disabled =
                                    x.dataset.cell !== undefined
                                        ? false
                                        : false;
                            });
                    }
                };
        });
}


if ($("ticBtn")) {

    $("ticBtn").onclick =
        async () => {

            if (ticBusy) {
                return;
            }

            try {

                const r =
                    await api(
                        "/api/game/tic/start",
                        {
                            method: "POST",
                            body: "{}"
                        }
                    );

                ticBusy = false;

                renderTic(
                    r.board
                );

            } catch (e) {

                ticBusy = false;

                toast(e.message);
            }
        };
}


/* =========================
   ВКЛАДКИ ЯИЦ
========================= */

document
    .querySelectorAll(".tab")
    .forEach(t => {

        t.onclick = () => {

            document
                .querySelectorAll(".tab")
                .forEach(x => {
                    x.classList.remove(
                        "active"
                    );
                });

            t.classList.add("active");

            /*
             * Старый index.html пока может иметь
             * data-tab="shop".
             *
             * Если там shop — показываем сундуки.
             */
            state.eggTab =
                t.dataset.tab === "collection"
                    ? "collection"
                    : "chests";

            loadEggs();
        };
    });


if ($("refreshEggs")) {

    $("refreshEggs").onclick =
        loadEggs;
}


/* =========================
   ЯЙЦА / СУНДУКИ
========================= */

async function loadEggs() {

    try {

        /*
         * Мои яйца.
         */
        if (
            state.eggTab ===
            "collection"
        ) {

            await loadEggCollection();

            return;
        }


        /*
         * Всё остальное = сундуки.
         */
        await loadChestShop();

    } catch (e) {

        toast(e.message);
    }
}


/* =========================
   МАГАЗИН СУНДУКОВ
========================= */

async function loadChestShop() {

    try {

        const r =
            await api(
                "/api/chests"
            );

        const chests =
            r.chests ||
            r.items ||
            [];


        const entries =
            Array.isArray(chests)
                ? chests.map(chest => [
                    String(
                        chest.id ??
                        chest.chest_id
                    ),
                    chest
                ])
                : Object.entries(chests);


        if (!$("eggContent")) {
            return;
        }


        $("eggContent").innerHTML = `

            <div class="egg-item">

                <h3>
                    🎁 Сундуки
                </h3>

                <p>
                    Покупай сундуки за Egg Coins
                    и получай случайные награды.
                </p>

            </div>

            ${
                entries.length
                    ? entries.map(([id, chest]) => {

                        const chestId =
                            chest.id ??
                            chest.chest_id ??
                            id;

                        const owned =
                            Number(
                                chest.owned ??
                                chest.count ??
                                0
                            );

                        const price =
                            Number(
                                chest.price || 0
                            );

                        return `

                            <div class="egg-item">

                                <div class="egg-top">

                                    <div>

                                        <div class="egg-name">

                                            ${esc(
                                                chest.name ||
                                                `Сундук #${chestId}`
                                            )}

                                        </div>

                                        <div class="rarity">

                                            🎁 Сундук

                                        </div>

                                    </div>

                                    <div class="price">

                                        ${price.toLocaleString()}
                                        🥚

                                    </div>

                                </div>


                                <p>

                                    📦 У тебя:
                                    <b>${owned}</b>

                                </p>


                                <button
                                    class="action buy-chest"
                                    data-id="${esc(chestId)}"
                                    type="button"
                                >

                                    🛒 Купить

                                </button>


                                ${
                                    owned > 0
                                        ? `

                                            <button
                                                class="action open-chest"
                                                data-id="${esc(chestId)}"
                                                type="button"
                                            >

                                                🎁 Открыть

                                            </button>

                                        `
                                        : ""
                                }

                            </div>

                        `;

                    }).join("")
                    : `

                        <div class="egg-item">

                            🎁 Сундуков пока нет.

                        </div>

                    `
            }

        `;


        /*
         * Покупка.
         */
        document
            .querySelectorAll(".buy-chest")
            .forEach(button => {

                button.onclick =
                    async () => {

                        const chestId =
                            Number(
                                button.dataset.id
                            );

                        if (
                            !Number.isInteger(
                                chestId
                            )
                        ) {

                            toast(
                                "Ошибка сундука"
                            );

                            return;
                        }


                        button.disabled = true;

                        try {

                            const x =
                                await api(
                                    "/api/chests/buy",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                chest_id:
                                                    chestId
                                            })
                                    }
                                );


                            if (x.data) {

                                setData(
                                    x.data
                                );
                            }


                            toast(
                                x.message ||
                                `🎁 Сундук куплен!`
                            );


                            await loadChestShop();


                        } catch (e) {

                            toast(
                                e.message
                            );

                            button.disabled =
                                false;
                        }
                    };
            });


        /*
         * Открытие.
         */
        document
            .querySelectorAll(".open-chest")
            .forEach(button => {

                button.onclick =
                    async () => {

                        const chestId =
                            Number(
                                button.dataset.id
                            );

                        await openChest(
                            chestId
                        );
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


/* =========================
   МОИ ЯЙЦА
========================= */

async function loadEggCollection() {

    try {

        const r =
            await api(
                "/api/eggs"
            );


        const shop =
            r.shop || {};

        const owned =
            r.owned || {};


        const entries =
            Array.isArray(shop)
                ? shop.map(e => [
                    String(e.id),
                    e
                ])
                : Object.entries(shop);


        const ownedEntries =
            entries.filter(
                ([id]) =>
                    Number(
                        owned[id] || 0
                    ) > 0
            );


        if (!$("eggContent")) {
            return;
        }


        if (!ownedEntries.length) {

            $("eggContent").innerHTML = `

                <div class="egg-item">

                    🎒 У тебя пока нет яиц.

                </div>

            `;

            return;
        }


        $("eggContent").innerHTML =
            ownedEntries
                .map(([id, e]) => `

                    <div class="egg-item">

                        <div class="egg-top">

                            <div>

                                <div class="egg-name">

                                    ${esc(
                                        e.emoji ||
                                        "🥚"
                                    )}

                                    ${esc(
                                        e.name
                                    )}

                                </div>

                                <div class="rarity">

                                    ${esc(
                                        e.rarity ||
                                        ""
                                    )}

                                </div>

                            </div>


                            <div class="price">

                                × ${Number(
                                    owned[id] || 0
                                )}

                            </div>

                        </div>


                        <button
                            class="action open-egg"
                            data-id="${id}"
                            type="button"
                        >

                            🥚 Открыть

                        </button>

                    </div>

                `)
                .join("");


        document
            .querySelectorAll(".open-egg")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/eggs/open",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                egg_id:
                                                    Number(
                                                        button
                                                            .dataset
                                                            .id
                                                    )
                                            })
                                    }
                                );


                            if (x.data) {

                                setData(
                                    x.data
                                );
                            }


                            toast(
                                x.message ||
                                `🎉 ${x.egg?.emoji || "🥚"} Яйцо открыто`
                            );


                            loadEggCollection();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


/* =========================
   MODAL
========================= */

function openModal(html) {

    if (!$("modal") || !$("modalContent")) {
        return;
    }

    $("modalContent").innerHTML =
        html;

    $("modal")
        .classList
        .remove("hidden");
}


function closeModal() {

    if (!$("modal")) {
        return;
    }

    $("modal")
        .classList
        .add("hidden");
}


if ($("modalClose")) {

    $("modalClose").onclick =
        closeModal;
}


if ($("modal")) {

    $("modal").onclick =
        e => {

            if (
                e.target.id ===
                "modal"
            ) {

                closeModal();
            }
        };
}


/* =========================
   ДОСТИЖЕНИЯ
========================= */

if ($("achievementsBtn")) {

    $("achievementsBtn").onclick =
        async () => {

            try {

                const r =
                    await api(
                        "/api/achievements"
                    );


                openModal(`

                    <h2>
                        🏆 Достижения
                    </h2>

                    ${
                        (r.items || [])
                            .map(a => `

                                <div class="achievement">

                                    <b>

                                        ${
                                            a.unlocked
                                                ? "✅"
                                                : "🔒"
                                        }

                                        ${esc(
                                            a.name
                                        )}

                                    </b>

                                    <div class="rarity">

                                        ${esc(
                                            a.description
                                        )}

                                    </div>

                                    <div class="price">

                                        🎁 +${a.reward}
                                        Egg Coins

                                    </div>

                                </div>

                            `)
                            .join("")
                    }

                `);

            } catch (e) {

                toast(e.message);
            }
        };
}


/* =========================
   ЛИДЕРБОРД
========================= */

if ($("leaderboardBtn")) {

    $("leaderboardBtn").onclick =
        async () => {

            try {

                const r =
                    await api(
                        "/api/leaderboard"
                    );


                openModal(`

                    <h2>
                        📊 Таблица лидеров
                    </h2>

                    ${
                        (r.players || [])
                            .map((p, i) => `

                                <div class="leader">

                                    <div>

                                        <b>

                                            ${
                                                p.avatar ||
                                                "🥚"
                                            }

                                            ${i + 1}.

                                            ${
                                                esc(
                                                    p.username
                                                        ? "@" +
                                                          p.username
                                                        : "ID " +
                                                          p.user_id
                                                )
                                            }

                                        </b>

                                        <small>

                                            ⭐ Уровень
                                            ${p.level}

                                        </small>

                                    </div>

                                    <b>

                                        🥚
                                        ${Number(
                                            p.egg_coins || 0
                                        ).toLocaleString()}

                                    </b>

                                </div>

                            `)
                            .join("")
                    }

                    <p>

                        Твоё место:
                        <b>
                            ${r.my_rank || "—"}
                        </b>

                    </p>

                `);

            } catch (e) {

                toast(e.message);
            }
        };
}


/* =========================
   ЕЖЕДНЕВНЫЕ ЗАДАНИЯ
========================= */

async function loadTasks() {

    try {

        const r =
            await api(
                "/api/daily/tasks"
            );


        openModal(`

            <h2>
                🎯 Ежедневные задания
            </h2>

            ${
                (r.tasks || [])
                    .map(t => `

                        <div class="task">

                            <b>
                                ${esc(
                                    t.title
                                )}
                            </b>

                            <div class="progress">

                                <div
                                    style="
                                        width:${Math.min(
                                            100,
                                            Number(t.progress || 0) /
                                            Math.max(
                                                1,
                                                Number(t.target || 1)
                                            ) *
                                            100
                                        )}%
                                    "
                                ></div>

                            </div>

                            <p>

                                ${t.progress}/${t.target}

                                · 🎁 +${t.reward}

                            </p>

                            <button
                                class="action claim-task"
                                data-id="${t.id}"
                                type="button"
                                ${
                                    t.claimed ||
                                    t.progress < t.target
                                        ? "disabled"
                                        : ""
                                }
                            >

                                ${
                                    t.claimed
                                        ? "Получено"
                                        : "Забрать"
                                }

                            </button>

                        </div>

                    `)
                    .join("")
            }

        `);


        document
            .querySelectorAll(".claim-task")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/daily/tasks/claim",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                task_id:
                                                    button
                                                        .dataset
                                                        .id
                                            })
                                    }
                                );


                            setData(
                                x.data
                            );


                            toast(
                                `🎁 +${x.reward} Egg Coins`
                            );


                            loadTasks();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


if ($("tasksBtn")) {

    $("tasksBtn").onclick =
        loadTasks;
}


/* =========================
   ЕЖЕДНЕВНОЙ БОНУС
========================= */

if ($("bonusBtn")) {

    $("bonusBtn").onclick =
        async () => {

            try {

                const r =
                    await api(
                        "/api/daily/bonus",
                        {
                            method:
                                "POST",

                            body: "{}"
                        }
                    );


                setData(
                    r.data
                );


                toast(
                    `🎁 +${r.reward} Egg Coins`
                );


            } catch (e) {

                toast(e.message);
            }
        };
}


/* =========================
   BOSS
========================= */

async function loadBoss() {

    try {

        const r =
            await api(
                "/api/boss"
            );


        const maxHp =
            Math.max(
                1,
                Number(r.max_hp || 1)
            );


        const hp =
            Math.max(
                0,
                Number(r.hp || 0)
            );


        openModal(`

            <h2>
                👾 EGG BOSS
            </h2>

            <div class="boss-name">
                🌑 Тёмный Хранитель
            </div>

            <div class="boss-hp">
                ${hp}/${maxHp}
            </div>

            <div class="boss-bar">

                <div
                    style="
                        width:${Math.min(
                            100,
                            hp / maxHp * 100
                        )}%
                    "
                ></div>

            </div>

            <p>

                ⚔️ Твой урон:
                <b>
                    ${r.my_damage || 0}
                </b>

            </p>

            <button
                id="attackBoss"
                class="primary"
                type="button"
            >

                ⚔️ Атаковать

            </button>

        `);


        $("attackBoss").onclick =
            async () => {

                try {

                    const x =
                        await api(
                            "/api/boss/attack",
                            {
                                method:
                                    "POST",

                                body: "{}"
                            }
                        );


                    setData(
                        x.data
                    );


                    toast(
                        x.defeated
                            ? "🎉 Босс побеждён!"
                            : `⚔️ -${x.damage} HP`
                    );


                    loadBoss();


                } catch (e) {

                    toast(
                        e.message
                    );
                }
            };


    } catch (e) {

        toast(e.message);
    }
}


if ($("bossBtn")) {

    $("bossBtn").onclick =
        loadBoss;
}


/* =========================
   ПРЕДМЕТЫ
========================= */

async function loadItems() {

    try {

        const r =
            await api(
                "/api/items"
            );


        const items =
            r.items || {};


        const entries =
            Array.isArray(items)
                ? items.map(
                    x => [
                        String(x.id),
                        x
                    ]
                )
                : Object.entries(
                    items
                );


        openModal(`

            <h2>
                🛒 Магазин предметов
            </h2>

            ${
                entries
                    .map(([id, x]) => `

                        <div class="item-card">

                            <div class="item-top">

                                <b>
                                    ${esc(
                                        x.name
                                    )}
                                </b>

                                <span class="price">

                                    ${Number(
                                        x.price || 0
                                    ).toLocaleString()}
                                    🥚

                                </span>

                            </div>

                            <div class="rarity">

                                ${esc(
                                    x.description
                                )}

                            </div>

                            <p>

                                📦 ${x.count || 0}

                                ${
                                    x.active_seconds
                                        ? ` · ⚡ активно ${x.active_seconds} сек.`
                                        : ""
                                }

                            </p>


                            <button
                                class="action buy-item"
                                data-id="${id}"
                                type="button"
                            >
                                Купить
                            </button>


                            ${
                                Number(x.count || 0)
                                    ? `
                                        <button
                                            class="action activate-item"
                                            data-id="${id}"
                                            type="button"
                                        >
                                            Активировать
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    `)
                    .join("")
            }

        `);


        document
            .querySelectorAll(".buy-item")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/items/buy",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                item_id:
                                                    Number(
                                                        button
                                                            .dataset
                                                            .id
                                                    )
                                            })
                                    }
                                );


                            setData(
                                x.data
                            );


                            toast(
                                "🛒 Куплено"
                            );


                            loadItems();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


        document
            .querySelectorAll(".activate-item")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/items/activate",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                item_id:
                                                    Number(
                                                        button
                                                            .dataset
                                                            .id
                                                    )
                                            })
                                    }
                                );


                            setData(
                                x.data
                            );


                            toast(
                                "⚡ Активировано на 10 минут"
                            );


                            loadItems();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


if ($("itemsBtn")) {

    $("itemsBtn").onclick =
        loadItems;
}


if ($("profileItems")) {

    $("profileItems").onclick =
        loadItems;
}


/* =========================
   ПИТОМЦЫ
========================= */

async function loadPets() {

    try {

        const r =
            await api(
                "/api/pets"
            );


        const pets =
            r.pets ||
            r.items ||
            [];


        const owned =
            r.owned ||
            r.player_pets ||
            r.my_pets ||
            [];


        const active =
            r.active_pet ||
            null;


        openModal(`

            <h2>
                🐾 Питомцы
            </h2>

            ${
                active
                    ? `

                        <div class="item-card">

                            <h3>
                                ⭐ Активный питомец
                            </h3>

                            <b>
                                🐾 ${esc(
                                    active.name ||
                                    "Питомец"
                                )}
                            </b>

                            <p>
                                Редкость:
                                ${esc(
                                    active.rarity ||
                                    "—"
                                )}
                            </p>

                            <p>
                                Бонус:
                                +${active.bonus_value || 0}
                            </p>

                        </div>

                    `
                    : `

                        <div class="item-card">

                            🐾 Активного питомца нет.

                        </div>

                    `
            }


            <h3>
                🎒 Мои питомцы
            </h3>


            ${
                owned.length
                    ? owned.map(p => `

                        <div class="item-card">

                            <div class="item-top">

                                <b>
                                    🐾 ${esc(
                                        p.name ||
                                        "Питомец"
                                    )}
                                </b>

                                <span>
                                    ${esc(
                                        p.rarity ||
                                        ""
                                    )}
                                </span>

                            </div>

                            <p>

                                ${esc(
                                    p.bonus_type ||
                                    "Бонус"
                                )}

                                :
                                +${p.bonus_value || 0}

                            </p>


                            <button
                                class="action activate-pet"
                                data-id="${
                                    p.pet_id ??
                                    p.id
                                }"
                                type="button"
                                ${
                                    p.active
                                        ? "disabled"
                                        : ""
                                }
                            >

                                ${
                                    p.active
                                        ? "✅ Активен"
                                        : "⚡ Активировать"
                                }

                            </button>

                        </div>

                    `).join("")
                    : `

                        <div class="item-card">

                            🎒 У тебя пока нет питомцев.

                        </div>

                    `
            }


            <h3>
                📖 Все питомцы
            </h3>


            ${
                pets.length
                    ? pets.map(p => `

                        <div class="item-card">

                            <div class="item-top">

                                <b>
                                    🐾 ${esc(
                                        p.name ||
                                        "Питомец"
                                    )}
                                </b>

                                <span>
                                    ${esc(
                                        p.rarity ||
                                        ""
                                    )}
                                </span>

                            </div>

                            <p>

                                ${esc(
                                    p.bonus_type ||
                                    "Бонус"
                                )}

                                :
                                +${p.bonus_value || 0}

                            </p>

                        </div>

                    `).join("")
                    : ""
            }

        `);


        document
            .querySelectorAll(".activate-pet")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/pets/activate",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                pet_id:
                                                    Number(
                                                        button
                                                            .dataset
                                                            .id
                                                    )
                                            })
                                    }
                                );


                            toast(
                                x.message ||
                                "🐾 Питомец активирован"
                            );


                            loadPets();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


if ($("petsBtn")) {

    $("petsBtn").onclick =
        loadPets;
}


if ($("profilePets")) {

    $("profilePets").onclick =
        loadPets;
}


/* =========================
   ОТДЕЛЬНОЕ ОКНО СУНДУКОВ
========================= */

async function loadChests() {

    try {

        const r =
            await api(
                "/api/chests"
            );


        const chests =
            r.chests ||
            r.items ||
            [];


        const entries =
            Array.isArray(chests)
                ? chests.map(chest => [
                    String(
                        chest.id ??
                        chest.chest_id
                    ),
                    chest
                ])
                : Object.entries(chests);


        openModal(`

            <h2>
                🎁 Сундуки
            </h2>

            <p>
                Покупай сундуки за Egg Coins
                и получай случайные награды.
            </p>

            ${
                entries.length
                    ? entries.map(([id, chest]) => {

                        const chestId =
                            chest.id ??
                            chest.chest_id ??
                            id;

                        const owned =
                            Number(
                                chest.owned ??
                                chest.count ??
                                0
                            );

                        const price =
                            Number(
                                chest.price || 0
                            );

                        return `

                            <div class="item-card">

                                <div class="item-top">

                                    <b>
                                        ${esc(
                                            chest.name ||
                                            `Сундук #${chestId}`
                                        )}
                                    </b>

                                    <span class="price">

                                        ${price.toLocaleString()}
                                        🥚

                                    </span>

                                </div>

                                <p>

                                    📦 У тебя:
                                    ${owned}

                                </p>

                                <button
                                    class="action buy-chest-modal"
                                    data-id="${chestId}"
                                    type="button"
                                >

                                    🛒 Купить

                                </button>

                                ${
                                    owned > 0
                                        ? `
                                            <button
                                                class="action open-chest-modal"
                                                data-id="${chestId}"
                                                type="button"
                                            >
                                                🎁 Открыть
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        `;

                    }).join("")
                    : `

                        <div class="item-card">

                            🎁 Сундуков пока нет.

                        </div>

                    `
            }

        `);


        document
            .querySelectorAll(".buy-chest-modal")
            .forEach(button => {

                button.onclick =
                    async () => {

                        try {

                            const x =
                                await api(
                                    "/api/chests/buy",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                chest_id:
                                                    Number(
                                                        button
                                                            .dataset
                                                            .id
                                                    )
                                            })
                                    }
                                );


                            if (x.data) {
                                setData(x.data);
                            }


                            toast(
                                x.message ||
                                "🎁 Сундук куплен!"
                            );


                            loadChests();


                        } catch (e) {

                            toast(
                                e.message
                            );
                        }
                    };
            });


        document
            .querySelectorAll(".open-chest-modal")
            .forEach(button => {

                button.onclick =
                    () => openChest(
                        Number(
                            button.dataset.id
                        )
                    );
            });


    } catch (e) {

        toast(e.message);
    }
}


async function openChest(chestId) {

    try {

        const r =
            await api(
                "/api/chests/open",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            chest_id:
                                chestId
                        })
                }
            );


        if (r.data) {

            setData(
                r.data
            );
        }


        /*
         * Показываем результат открытия.
         */
        if (r.reward) {

            if (r.reward.type === "egg") {

                toast(
                    `🥚 Получено яйцо: ${
                        r.reward.egg?.name ||
                        "Яйцо"
                    }`
                );

            } else if (
                r.reward.type === "pet"
            ) {

                toast(
                    `🐾 Получен питомец: ${
                        r.reward.pet?.name ||
                        "Питомец"
                    }`
                );

            } else if (
                r.reward.type === "coins"
            ) {

                toast(
                    `🥚 +${r.reward.amount} Egg Coins`
                );

            } else if (
                r.reward.type === "booster"
            ) {

                toast(
                    `⚡ Получен предмет: ${
                        r.reward.item?.name ||
                        "Бустер"
                    }`
                );

            } else if (
                r.reward.type === "xp"
            ) {

                toast(
                    `⭐ +${r.reward.amount} XP`
                );

            } else {

                toast(
                    r.message ||
                    "🎁 Сундук открыт!"
                );
            }

        } else {

            toast(
                r.message ||
                "🎁 Сундук открыт!"
            );
        }


        /*
         * Если мы сейчас на странице яиц —
         * обновляем магазин.
         */
        if (
            state.eggTab === "chests"
        ) {

            await loadChestShop();

        } else {

            await loadChests();
        }


    } catch (e) {

        toast(e.message);
    }
}


if ($("chestsBtn")) {

    $("chestsBtn").onclick =
        loadChests;
}


/* =========================
   РЫНОК
========================= */

async function loadMarket() {

    try {

        const r =
            await api(
                "/api/market"
            );


        const listings =
            r.listings ||
            r.items ||
            [];


        openModal(`

            <h2>
                🏪 Рынок
            </h2>

            <button
                id="marketSell"
                class="primary"
                type="button">

                🥚 Продать яйцо

            </button>


            <h3>
                🛒 Объявления
            </h3>


            ${
                listings.length
                    ? listings.map(item => `

                        <div class="item-card">

                            <div class="item-top">

                                <b>

                                    🥚
                                    ${esc(
                                        item.egg_name ||
                                        item.name ||
                                        `Яйцо #${item.egg_id}`
                                    )}

                                </b>

                                <span class="price">

                                    ${Number(
                                        item.price || 0
                                    ).toLocaleString()}

                                    🥚

                                </span>

                            </div>

                            <p>

                                Продавец:
                                ${
                                    esc(
                                        item.seller_username ||
                                        item.seller_name ||
                                        "Игрок"
                                    )
                                }

                            </p>


                            ${
                                Number(
                                    item.seller_id ??
                                    item.user_id
                                ) ===
                                Number(
                                    state.user?.id
                                )
                                    ? `

                                        <button
                                            class="action cancel-listing"
                                            data-id="${item.id}"
                                            type="button">

                                            ❌ Отменить

                                        </button>

                                    `
                                    : `

                                        <button
                                            class="action buy-listing"
                                            data-id="${item.id}"
                                            type="button">

                                            💰 Купить

                                        </button>

                                    `
                            }

                        </div>

                    `).join("")
                    : `

                        <div class="item-card">

                            🏪 На рынке пока нет объявлений.

                        </div>

                    `
            }

        `);


        if ($("marketSell")) {

            $("marketSell").onclick =
                openMarketSell;
        }


        document
            .querySelectorAll(".buy-listing")
            .forEach(button => {

                button.onclick =
                    () => buyMarketListing(
                        Number(
                            button.dataset.id
                        )
                    );

            });


        document
            .querySelectorAll(".cancel-listing")
            .forEach(button => {

                button.onclick =
                    () => cancelMarketListing(
                        Number(
                            button.dataset.id
                        )
                    );

            });


    } catch (e) {

        toast(e.message);
    }
}


async function openMarketSell() {

    try {

        const r =
            await api(
                "/api/eggs"
            );


        const shop =
            r.shop || {};

        const owned =
            r.owned || {};


        const entries =
            Array.isArray(shop)
                ? shop.filter(
                    egg =>
                        Number(
                            owned[egg.id] || 0
                        ) > 0
                )
                : Object.entries(shop)
                    .map(([id, egg]) => ({
                        ...egg,
                        id:
                            egg.id ??
                            id
                    }))
                    .filter(
                        egg =>
                            Number(
                                owned[egg.id] || 0
                            ) > 0
                    );


        openModal(`

            <h2>
                🥚 Продать яйцо
            </h2>

            ${
                entries.length
                    ? entries.map(egg => `

                        <div class="item-card">

                            <b>
                                ${esc(
                                    egg.emoji ||
                                    "🥚"
                                )}

                                ${esc(
                                    egg.name ||
                                    `Яйцо #${egg.id}`
                                )}
                            </b>

                            <p>

                                У тебя:
                                ${
                                    owned[egg.id] ||
                                    0
                                }

                            </p>

                            <input
                                id="marketPrice_${egg.id}"
                                class="input"
                                type="number"
                                min="1"
                                placeholder="Цена в Egg Coins"
                            >

                            <button
                                class="action sell-egg"
                                data-id="${egg.id}"
                                type="button">

                                🏪 Выставить

                            </button>

                        </div>

                    `).join("")
                    : `

                        <div class="item-card">

                            🎒 У тебя нет яиц для продажи.

                        </div>

                    `
            }

        `);


        document
            .querySelectorAll(".sell-egg")
            .forEach(button => {

                button.onclick =
                    async () => {

                        const eggId =
                            Number(
                                button.dataset.id
                            );


                        const input =
                            $(
                                `marketPrice_${eggId}`
                            );


                        const price =
                            Number(
                                input?.value
                            );


                        if (
                            !Number.isInteger(price) ||
                            price <= 0
                        ) {

                            toast(
                                "Введи правильную цену"
                            );

                            return;
                        }


                        try {

                            const x =
                                await api(
                                    "/api/market/list",
                                    {
                                        method:
                                            "POST",

                                        body:
                                            JSON.stringify({
                                                egg_id:
                                                    eggId,
                                                price
                                            })
                                    }
                                );


                            if (x.data) {
                                setData(x.data);
                            }


                            toast(
                                x.message ||
                                "🏪 Яйцо выставлено на рынок"
                            );


                            loadMarket();


                        } catch (e) {

                            toast(e.message);
                        }
                    };
            });


    } catch (e) {

        toast(e.message);
    }
}


async function buyMarketListing(listingId) {

    try {

        const r =
            await api(
                "/api/market/buy",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            listing_id:
                                listingId
                        })
                }
            );


        if (r.data) {
            setData(r.data);
        }


        toast(
            r.message ||
            "🏪 Покупка выполнена!"
        );


        loadMarket();


    } catch (e) {

        toast(e.message);
    }
}


async function cancelMarketListing(listingId) {

    try {

        const r =
            await api(
                "/api/market/cancel",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            listing_id:
                                listingId
                        })
                }
            );


        if (r.data) {
            setData(r.data);
        }


        toast(
            r.message ||
            "❌ Объявление отменено"
        );


        loadMarket();


    } catch (e) {

        toast(e.message);
    }
}


if ($("marketBtn")) {

    $("marketBtn").onclick =
        loadMarket;
}


/* =========================
   КРАЖА ЯИЦ
========================= */

async function loadStealPlayers() {

    try {

        const r =
            await api(
                "/api/steal/players"
            );


        const players =
            r.players ||
            r.items ||
            [];


        openModal(`

            <h2>
                🥷 Украсть яйцо
            </h2>

            <p>
                Выбери игрока и попробуй
                украсть одно из его яиц.
            </p>


            ${
                players.length
                    ? players.map(player => `

                        <div class="item-card">

                            <div class="item-top">

                                <b>

                                    ${
                                        player.avatar ||
                                        "🥚"
                                    }

                                    ${esc(
                                        player.username
                                            ? "@" +
                                              player.username
                                            : "Игрок"
                                    )}

                                </b>

                                <span>
                                    🥚
                                    ${
                                        player.eggs_total ??
                                        player.eggs ??
                                        0
                                    }
                                </span>

                            </div>


                            <button
                                class="action steal-player"
                                data-id="${
                                    player.user_id ??
                                    player.id
                                }"
                                type="button">

                                🥷 Попробовать украсть

                            </button>

                        </div>

                    `).join("")
                    : `

                        <div class="item-card">

                            😔 Подходящих игроков нет.

                        </div>

                    `
            }

        `);


        document
            .querySelectorAll(".steal-player")
            .forEach(button => {

                button.onclick =
                    () => stealEgg(
                        Number(
                            button.dataset.id
                        )
                    );

            });


    } catch (e) {

        toast(e.message);
    }
}


async function stealEgg(victimId) {

    if (
        !confirm(
            "Попробовать украсть яйцо?"
        )
    ) {

        return;
    }


    try {

        const r =
            await api(
                "/api/steal",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            victim_id:
                                victimId
                        })
                }
            );


        if (r.data) {
            setData(r.data);
        }


        toast(
            r.message ||
            (
                r.success
                    ? "🥷 Яйцо украдено!"
                    : "❌ Кража не удалась"
            )
        );


        loadStealPlayers();


    } catch (e) {

        toast(e.message);
    }
}


if ($("stealBtn")) {

    $("stealBtn").onclick =
        loadStealPlayers;
}


/* =========================
   EGG PASS
========================= */

async function loadEggPass() {

    try {

        const r =
            await api(
                "/api/egg-pass"
            );


        const levels =
            r.levels ||
            r.items ||
            [];


        const currentXp =
            Number(
                r.xp ||
                r.pass_xp ||
                0
            );


        const currentLevel =
            Number(
                r.level ||
                r.pass_level ||
                1
            );


        const premium =
            Boolean(
                r.premium
            );


        openModal(`

            <h2>
                🎫 Egg Pass
            </h2>

            <div class="item-card">

                <b>
                    ⭐ Уровень Pass:
                    ${currentLevel}
                </b>

                <p>
                    XP:
                    ${currentXp}
                </p>

                <p>
                    ${
                        premium
                            ? "💎 Premium активен"
                            : "🆓 Бесплатная ветка"
                    }
                </p>

            </div>


            ${
                levels.length
                    ? levels.map(level => {

                        const levelNumber =
                            Number(
                                level.level ||
                                level.id ||
                                1
                            );


                        const claimed =
                            Boolean(
                                level.claimed
                            );


                        return `

                            <div class="item-card">

                                <div class="item-top">

                                    <b>
                                        ⭐ Уровень
                                        ${levelNumber}
                                    </b>

                                    <span>
                                        ${
                                            claimed
                                                ? "✅"
                                                : "🔒"
                                        }
                                    </span>

                                </div>


                                <p>

                                    🆓 Награда:
                                    ${
                                        level.free_reward ??
                                        level.free ??
                                        0
                                    }
                                    🥚

                                </p>


                                <p>

                                    💎 Premium:
                                    ${
                                        level.premium_reward ??
                                        level.premium ??
                                        0
                                    }
                                    🥚

                                </p>


                                ${
                                    level.unlocked &&
                                    !claimed
                                        ? `

                                            <button
                                                class="action claim-pass"
                                                data-level="${levelNumber}"
                                                data-track="free"
                                                type="button">

                                                🎁 Получить

                                            </button>

                                        `
                                        : ""
                                }

                            </div>

                        `;

                    }).join("")
                    : `

                        <div class="item-card">

                            🎫 Уровни Egg Pass пока не загружены.

                        </div>

                    `
            }

        `);


        document
            .querySelectorAll(".claim-pass")
            .forEach(button => {

                button.onclick =
                    () => claimEggPass(
                        Number(
                            button.dataset.level
                        ),
                        button.dataset.track
                    );

            });


    } catch (e) {

        toast(e.message);
    }
}


async function claimEggPass(
    level,
    track
) {

    try {

        const r =
            await api(
                "/api/egg-pass/claim",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            level,
                            track
                        })
                }
            );


        if (r.data) {
            setData(r.data);
        }


        toast(
            r.message ||
            "🎁 Награда Egg Pass получена!"
        );


        loadEggPass();


    } catch (e) {

        toast(e.message);
    }
}


if ($("eggPassBtn")) {

    $("eggPassBtn").onclick =
        loadEggPass;
}


/* =========================
   АВАТАР
========================= */

const DEFAULT_AVATARS = [
    "🥚",
    "🐣",
    "🐤",
    "🐥",
    "🐔",
    "🦆",
    "🐲",
    "🦄",
    "👑",
    "💎",
    "🔥",
    "⚡",
    "🌑",
    "🚀",
    "👾"
];


function getAvatars() {

    if (
        state.data &&
        Array.isArray(
            state.data.avatars
        ) &&
        state.data.avatars.length
    ) {

        return state.data.avatars;
    }


    return DEFAULT_AVATARS;
}


function openAvatarSelector() {

    const avatars =
        getAvatars();


    const current =
        state.data?.avatar ||
        "🥚";


    openModal(`

        <h2>
            🖼️ Выбор аватара
        </h2>

        <p>
            Выбери свой аватар:
        </p>

        <div
            class="avatar-grid"
            style="
                display:grid;
                grid-template-columns:
                    repeat(5,1fr);
                gap:10px;
                margin-top:15px;
            "
        >

            ${
                avatars
                    .map(avatar => `

                        <button
                            class="avatar-choice"
                            data-avatar="${esc(
                                avatar
                            )}"
                            type="button"
                            style="
                                font-size:32px;
                                padding:12px;
                                border-radius:14px;
                                background:
                                    ${
                                        avatar === current
                                            ? "#6730a3"
                                            : "#20102e"
                                    };
                                border:
                                    1px solid
                                    rgba(
                                        255,
                                        255,
                                        255,
                                        .08
                                    );
                            "
                        >
                            ${esc(avatar)}
                        </button>

                    `)
                    .join("")
            }

        </div>

    `);


    document
        .querySelectorAll(".avatar-choice")
        .forEach(button => {

            button.onclick =
                async () => {

                    const avatar =
                        button.dataset.avatar;


                    try {

                        const r =
                            await api(
                                "/api/profile/avatar",
                                {
                                    method:
                                        "POST",

                                    body:
                                        JSON.stringify({
                                            avatar
                                        })
                                }
                            );


                        if (r.data) {

                            setData(
                                r.data
                            );

                        } else if (r.avatar) {

                            if (!state.data) {
                                state.data = {};
                            }

                            state.data.avatar =
                                r.avatar;

                            setData(
                                state.data
                            );
                        }


                        closeModal();


                        toast(
                            `🖼️ Аватар изменён на ${avatar}`
                        );


                    } catch (e) {

                        toast(e.message);
                    }
                };
        });
}


/* =========================
   КНОПКИ АВАТАРА
========================= */

if ($("avatarButton")) {

    $("avatarButton").onclick =
        openAvatarSelector;
}


if ($("changeAvatarBtn")) {

    $("changeAvatarBtn").onclick =
        openAvatarSelector;
}


/* =========================
   ВЫВОД ЯИЦ
========================= */

async function openWithdrawal() {

    try {

        const r =
            await api(
                "/api/withdrawal"
            );


        const eggs =
            r.eggs || {};


        const shop =
            r.shop || {};


        const entries =
            Array.isArray(shop)
                ? shop.map(
                    e => [
                        String(e.id),
                        e
                    ]
                )
                : Object.entries(
                    shop
                );


        const owned =
            entries.filter(
                ([id]) =>
                    Number(
                        eggs[id] || 0
                    ) > 0
            );


        const total =
            Number(
                r.total_eggs ??
                r.total ??
                Object.values(eggs)
                    .reduce(
                        (sum, value) =>
                            sum +
                            Number(
                                value || 0
                            ),
                        0
                    )
            );


        openModal(`

            <h2>
                🥚 Вывод яиц
            </h2>

            <p>

                Всего яиц:
                <b>${total}</b>

            </p>


            ${
                owned.length
                    ? owned
                        .map(([id, egg]) => `

                            <div class="egg-item">

                                ${
                                    esc(
                                        egg.emoji ||
                                        "🥚"
                                    )
                                }

                                ${esc(
                                    egg.name ||
                                    `Яйцо #${id}`
                                )}

                                ×
                                ${Number(
                                    eggs[id] || 0
                                )}

                            </div>

                        `)
                        .join("")
                    : `

                        <p>
                            🎒 У тебя нет яиц.
                        </p>

                    `
            }


            <button
                id="withdrawGo"
                class="primary"
                type="button"
            >

                🥚 Перейти к боту вывода

            </button>

        `);


        $("withdrawGo").onclick =
            () => {

                if (
                    tg?.openTelegramLink &&
                    r.bot
                ) {

                    tg.openTelegramLink(
                        r.bot
                    );

                } else if (r.bot) {

                    window.open(
                        r.bot,
                        "_blank"
                    );
                }
            };


    } catch (e) {

        toast(e.message);
    }
}


if ($("withdrawBtn")) {

    $("withdrawBtn").onclick =
        openWithdrawal;
}


if ($("profileWithdraw")) {

    $("profileWithdraw").onclick =
        openWithdrawal;
}


/* =========================
   ЗАПУСК
========================= */

init();
