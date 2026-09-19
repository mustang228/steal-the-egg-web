const tg = window.Telegram?.WebApp;
const state = { user: null, data: null, eggTab: 'shop' };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));

function headers() {
    return { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' };
}

async function api(url, options = {}) {
    const r = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const d = await r.json().catch(() => ({ ok:false, error:'Ошибка сервера' }));
    if (!r.ok || d.ok === false) throw Error(d.error || 'Ошибка');
    return d;
}

function toast(t) {
    const e = $('toast');
    if (!e) return;
    e.textContent = t;
    e.classList.add('show');
    clearTimeout(window.tt);
    window.tt = setTimeout(() => e.classList.remove('show'), 2200);
}

function showPage(p) {
    document.querySelectorAll('.page').forEach(x => x.classList.toggle('active', x.id === p));
    document.querySelectorAll('[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === p));
    scrollTo(0, 0);
}

function setData(d) {
    state.data = d;
    const x = d || {};
    const required = Math.max(100, Number(x.xp_required) || ((Number(x.level) || 1) * 100));
    const xp = Number(x.xp) || 0;
    const avatar = x.avatar || '🥚';

    if ($('tapCoins')) $('tapCoins').textContent = (Number(x.tap_coins) || 0).toLocaleString();
    if ($('eggCoins')) $('eggCoins').textContent = (Number(x.egg_coins) || 0).toLocaleString();
    if ($('streak')) $('streak').textContent = x.streak || 0;
    if ($('level')) $('level').textContent = x.level || 1;
    if ($('xpText')) $('xpText').textContent = `${xp}/${required} XP`;
    if ($('xpBar')) $('xpBar').style.width = Math.min(100, xp / required * 100) + '%';

    if ($('profileName')) $('profileName').textContent = state.user?.first_name || 'Игрок';
    if ($('profileId')) $('profileId').textContent = `ID: ${state.user?.id || '—'}`;
    if ($('profileTap')) $('profileTap').textContent = (Number(x.tap_coins) || 0).toLocaleString();
    if ($('profileEgg')) $('profileEgg').textContent = (Number(x.egg_coins) || 0).toLocaleString();
    if ($('profileEggs')) $('profileEggs').textContent = x.eggs_total || 0;
    if ($('profileAch')) $('profileAch').textContent = (x.achievements || []).length;
    if ($('profileAvatar')) $('profileAvatar').textContent = avatar;
}

async function init() {
    if (tg) { tg.ready(); tg.expand(); }
    try {
        const r = await api('/api/init', { method:'POST', body:'{}' });
        state.user = r.user;
        setData(r.data);
        if ($('username')) $('username').textContent = state.user.username ? '@' + state.user.username : state.user.first_name || 'Игрок';
        $('app')?.classList.remove('hidden');
        if (r.login.claimed) toast(`🔥 Серия ${r.login.streak} дней · +${r.login.reward} Egg Coins`);
        (r.new_achievements || []).forEach(a => setTimeout(() => toast(`🏆 ${a.name} · +${a.reward} Egg Coins`), 700));
    } catch (e) {
        $('app')?.classList.remove('hidden');
        if ($('username')) $('username').textContent = 'Открой приложение через Telegram';
        toast(e.message);
    }
}

document.addEventListener('click', e => {
    const p = e.target.closest('[data-page]');
    if (p) showPage(p.dataset.page);
});

// TAP
$('eggTap').onclick = async e => {
    const b = e.currentTarget;
    const r = b.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'floater'; f.textContent = '+1';
    f.style.left = (r.left + r.width / 2 - 10) + 'px';
    f.style.top = (r.top + 40) + 'px';
    $('tapFloaters')?.appendChild(f);
    setTimeout(() => f.remove(), 800);
    tg?.HapticFeedback?.impactOccurred('light');
    try {
        const r = await api('/api/tap', { method:'POST', body:JSON.stringify({ amount:1 }) });
        setData(r.data);
        (r.new_achievements || []).forEach(a => toast(`🏆 ${a.name} · +${a.reward}`));
    } catch (e) { toast(e.message); }
};

// EXCHANGE
$('exchangeBtn').onclick = async () => {
    if (!state.data || Number(state.data.tap_coins) < 30) { toast('Нужно минимум 30 Tap Coins'); return; }
    try {
        const r = await api('/api/exchange', { method:'POST', body:'{}' });
        setData(r.data); toast(`🥚 +${r.received} Egg Coins`);
    } catch (e) { toast(e.message); }
};

// GUESS NUMBER
$('guessBtn').onclick = async () => {
    try {
        await api('/api/game/guess/start', { method:'POST', body:'{}' });
        renderGuess();
    } catch (e) { toast(e.message); }
};

function renderGuess(info = '') {
    $('gameArea').innerHTML = `<h3>🔢 Угадай число</h3>
        <p>Число от 1 до 20 · до 10 попыток</p>
        <input id="guessInput" class="input" type="number" min="1" max="20" placeholder="Твоё число">
        <button id="guessSend" class="primary">Ответить</button>
        <p id="guessInfo">${esc(info)}</p>`;
    $('guessInput').focus();
    $('guessSend').onclick = async () => {
        try {
            const r = await api('/api/game/guess/answer', { method:'POST', body:JSON.stringify({ guess:Number($('guessInput').value) }) });
            if (r.result === 'continue') {
                $('guessInfo').textContent = `💡 ${r.hint} · попытка ${r.attempts}/10`;
                $('guessInput').value = '';
                $('guessInput').focus();
                return;
            }
            setData(r.data);
            $('gameArea').innerHTML = `<h3>${r.result === 'win' ? '🎉 Победа!' : '❌ Игра окончена'}</h3>
                <p>Загаданное число: <b>${r.number}</b></p><p>Попыток: ${r.attempts}/10</p>
                <p>Награда: +${r.reward} Egg Coins</p><button id="guessAgain" class="primary">🔄 Играть ещё</button>`;
            $('guessAgain').onclick = () => $('guessBtn').click();
        } catch (e) { toast(e.message); }
    };
}

// MATH
$('mathBtn').onclick = async () => {
    try {
        const r = await api('/api/game/math/start', { method:'POST', body:'{}' });
        renderMath(r.question);
    } catch (e) { toast(e.message); }
};

function renderMath(question, message = '') {
    $('gameArea').innerHTML = `<h3>🧠 Математика</h3>
        ${message ? `<p><b>${esc(message)}</b></p>` : ''}
        <div class="boss-hp">${esc(question)}</div>
        <input id="mathInput" class="input" type="number" placeholder="Ответ">
        <button id="mathSend" class="primary">Проверить</button>`;
    $('mathInput').focus();
    $('mathSend').onclick = async () => {
        try {
            const r = await api('/api/game/math/answer', { method:'POST', body:JSON.stringify({ answer:Number($('mathInput').value) }) });
            setData(r.data);
            if (r.result === 'wrong') {
                renderMath(r.question, `❌ Неправильно! Правильный ответ: ${r.correct}. Новый пример ниже 👇`);
                return;
            }
            $('gameArea').innerHTML = `<h3>🎉 Правильно!</h3><p>Ответ: <b>${r.correct}</b></p>
                <p>Награда: +${r.reward} Egg Coins</p><button id="mathAgain" class="primary">🧠 Следующий пример</button>`;
            $('mathAgain').onclick = () => $('mathBtn').click();
        } catch (e) { toast(e.message); }
    };
}

// TIC TAC TOE
$('ticBtn').onclick = async () => {
    try {
        const r = await api('/api/game/tic/start', { method:'POST', body:'{}' });
        renderTic(r.board);
    } catch (e) { toast(e.message); }
};

function renderTic(board) {
    $('gameArea').innerHTML = `<h3>❌⭕ Крестики-нолики</h3>
        <div class="tic">${board.map((v,i) => `<button data-cell="${i}">${v === ' ' ? '⬜' : v === 'X' ? '❌' : '⭕'}</button>`).join('')}</div>
        <p>Ты играешь за ❌</p>`;
    document.querySelectorAll('[data-cell]').forEach(b => b.onclick = async () => {
        try {
            const r = await api('/api/game/tic/move', { method:'POST', body:JSON.stringify({ index:Number(b.dataset.cell) }) });
            if (r.result === 'continue') { renderTic(r.board); return; }
            setData(r.data);
            $('gameArea').innerHTML = `<h3>${r.result === 'win' ? '🎉 Победа!' : r.result === 'draw' ? '🤝 Ничья!' : '❌ Поражение'}</h3>
                <p>Награда: +${r.reward} Egg Coins</p><button id="ticAgain" class="primary">🔄 Играть ещё</button>`;
            $('ticAgain').onclick = () => $('ticBtn').click();
        } catch (e) { toast(e.message); }
    });
}

// EGGS

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); state.eggTab = t.dataset.tab; loadEggs();
});
$('refreshEggs').onclick = loadEggs;

async function loadEggs() {
    try {
        const r = await api('/api/eggs');
        const shop = r.shop || {};
        const owned = r.owned || {};
        if (state.eggTab === 'shop') {
            $('eggContent').innerHTML = Object.entries(shop).map(([id,e]) => `<div class="egg-item">
                <div class="egg-top"><div><div class="egg-name">${esc(e.name)}</div><div class="rarity">${esc(e.rarity)}</div></div>
                <div class="price">${e.price} 🥚</div></div>
                <button class="action buy-egg" data-id="${id}">🛒 Купить</button></div>`).join('');
            document.querySelectorAll('.buy-egg').forEach(b => b.onclick = async () => {
                try {
                    const x = await api('/api/eggs/buy', { method:'POST', body:JSON.stringify({ egg_id:Number(b.dataset.id) }) });
                    setData(x.data); toast(`🎉 Получено: ${x.egg.name}`); loadEggs();
                } catch (e) { toast(e.message); }
            });
        } else {
            const rows = Object.entries(shop).filter(([id]) => Number(owned[id] || 0) > 0).map(([id,e]) => `<div class="egg-item">
                <div class="egg-name">${esc(e.name)} × ${owned[id]}</div><div class="rarity">${esc(e.rarity)}</div>
                <button class="action open-egg" data-id="${id}">🥚 Открыть</button></div>`).join('');
            $('eggContent').innerHTML = rows || '<div class="egg-item">🎒 У тебя пока нет яиц.</div>';
            document.querySelectorAll('.open-egg').forEach(b => b.onclick = async () => {
                try {
                    const x = await api('/api/eggs/open', { method:'POST', body:JSON.stringify({ egg_id:Number(b.dataset.id) }) });
                    setData(x.data); toast(`🎁 ${x.egg.name} открылось: +${x.reward} Egg Coins`); loadEggs();
                } catch (e) { toast(e.message); }
            });
        }
    } catch (e) { toast(e.message); }
}

// MODAL
function openModal(h) { $('modalContent').innerHTML = h; $('modal').classList.remove('hidden'); }
$('modalClose').onclick = () => $('modal').classList.add('hidden');
$('modal').onclick = e => { if (e.target.id === 'modal') $('modal').classList.add('hidden'); };

// AVATAR
$('profileAvatar').onclick = openAvatarPicker;
$('changeAvatarBtn').onclick = openAvatarPicker;
async function openAvatarPicker() {
    try {
        const r = await api('/api/profile/avatars');
        openModal(`<h2>🎭 Выбери аватар</h2><p>Твой эмодзи будет виден в профиле и таблице лидеров.</p>
            <div class="avatar-grid">${r.avatars.map(a => `<button class="avatar-choice ${a===r.current?'selected':''}" data-avatar="${a}">${a}</button>`).join('')}</div>`);
        document.querySelectorAll('.avatar-choice').forEach(b => b.onclick = async () => {
            try {
                const x = await api('/api/profile/avatar', { method:'POST', body:JSON.stringify({ avatar:b.dataset.avatar }) });
                setData(x.data); toast(`🎭 Аватар изменён на ${x.avatar}`); $('modal').classList.add('hidden');
            } catch (e) { toast(e.message); }
        });
    } catch (e) { toast(e.message); }
}

// ACHIEVEMENTS
$('achievementsBtn').onclick = async () => {
    try { const r = await api('/api/achievements'); openModal(`<h2>🏆 Достижения</h2>${r.items.map(a => `<div class="achievement"><b>${a.unlocked?'✅':'🔒'} ${esc(a.name)}</b><div class="rarity">${esc(a.description)}</div><div class="price">🎁 +${a.reward} Egg Coins</div></div>`).join('')}`); }
    catch (e) { toast(e.message); }
};

// LEADERBOARD
$('leaderboardBtn').onclick = async () => {
    try {
        const r = await api('/api/leaderboard');
        openModal(`<h2>📊 Таблица лидеров</h2>${r.players.map((p,i) => `<div class="leader">
            <div class="leader-left"><span class="leader-avatar">${p.avatar || '🥚'}</span><div><b>${i+1}. ${esc(p.username?'@'+p.username:'ID '+p.user_id)}</b><small>⭐ Уровень ${p.level}</small></div></div>
            <b>🥚 ${p.egg_coins}</b></div>`).join('')}<p>Твоё место: <b>${r.my_rank}</b></p>`);
    } catch (e) { toast(e.message); }
};

// TASKS / BONUS / BOSS / ITEMS
async function loadTasks() {
    try {
        const r = await api('/api/daily/tasks');
        openModal(`<h2>🎯 Ежедневные задания</h2>${r.tasks.map(t => `<div class="task"><b>${esc(t.title)}</b><div class="progress"><div style="width:${Math.min(100,t.progress/t.target*100)}%"></div></div><p>${t.progress}/${t.target} · 🎁 +${t.reward}</p><button class="action claim-task" data-id="${t.id}" ${t.claimed||t.progress<t.target?'disabled':''}>${t.claimed?'Получено':'Забрать'}</button></div>`).join('')}`);
        document.querySelectorAll('.claim-task').forEach(b => b.onclick = async () => { try { const x=await api('/api/daily/tasks/claim',{method:'POST',body:JSON.stringify({task_id:b.dataset.id})}); setData(x.data); toast(`🎁 +${x.reward} Egg Coins`); loadTasks(); } catch(e){toast(e.message);} });
    } catch(e){toast(e.message);}
}
$('tasksBtn').onclick=loadTasks;
$('bonusBtn').onclick=async()=>{try{const r=await api('/api/daily/bonus',{method:'POST',body:'{}'});setData(r.data);toast(`🎁 +${r.reward} Egg Coins`)}catch(e){toast(e.message)}};

async function loadBoss(){try{const r=await api('/api/boss');openModal(`<h2>👾 EGG BOSS</h2><div class="boss-name">🌑 Тёмный Хранитель</div><div class="boss-hp">${r.hp}/${r.max_hp}</div><div class="boss-bar"><div style="width:${r.hp/r.max_hp*100}%"></div></div><p>⚔️ Твой урон: <b>${r.my_damage}</b></p><button id="attackBoss" class="primary">⚔️ Атаковать</button>`);$('attackBoss').onclick=async()=>{try{const x=await api('/api/boss/attack',{method:'POST',body:'{}'});setData(x.data);toast(x.defeated?'🎉 Босс побеждён! +100 Egg Coins':'⚔️ -'+x.damage+' HP');loadBoss()}catch(e){toast(e.message)}}}catch(e){toast(e.message)}}
$('bossBtn').onclick=loadBoss;

async function loadItems(){try{const r=await api('/api/items');openModal(`<h2>🛒 Магазин предметов</h2>${Object.entries(r.items).map(([id,x])=>`<div class="item-card"><div class="item-top"><b>${esc(x.name)}</b><span class="price">${x.price} 🥚</span></div><div class="rarity">${esc(x.description)}</div><p>📦 ${x.count}${x.active_seconds?' · ⚡ активно '+x.active_seconds+' сек.':''}</p><button class="action buy-item" data-id="${id}">🛒 Купить</button>${x.count?`<button class="action activate-item" data-id="${id}">⚡ Активировать</button>`:''}</div>`).join('')}`);document.querySelectorAll('.buy-item').forEach(b=>b.onclick=async()=>{try{const x=await api('/api/items/buy',{method:'POST',body:JSON.stringify({item_id:Number(b.dataset.id)})});setData(x.data);toast('🛒 Куплено');loadItems()}catch(e){toast(e.message)}});document.querySelectorAll('.activate-item').forEach(b=>b.onclick=async()=>{try{const x=await api('/api/items/activate',{method:'POST',body:JSON.stringify({item_id:Number(b.dataset.id)})});setData(x.data);toast('⚡ Активировано на 10 минут');loadItems()}catch(e){toast(e.message)}})}catch(e){toast(e.message)}}
$('itemsBtn').onclick=loadItems;$('profileItems').onclick=loadItems;

async function openWithdrawal(){try{const r=await api('/api/withdrawal');openModal(`<h2>🥚 Вывод яиц</h2><p>Всего яиц: <b>${r.total}</b></p>${Object.values(r.eggs).map(e=>`<div class="egg-item"><b>${esc(e.name)}</b> × ${e.count}</div>`).join('')||'<p>🎒 У тебя нет яиц.</p>'}<button id="withdrawGo" class="primary">🥚 Перейти к боту вывода</button>`);$('withdrawGo').onclick=()=>{if(tg?.openTelegramLink)tg.openTelegramLink(r.bot);else window.open(r.bot,'_blank')}}catch(e){toast(e.message)}}
$('withdrawBtn').onclick=openWithdrawal;$('profileWithdraw').onclick=openWithdrawal;

loadEggs();
init();
