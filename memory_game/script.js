// 定数とDOM要素
const gameBoard = document.getElementById('gameBoard');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const resetButton = document.getElementById('resetButton');
const messageDisplay = document.getElementById('message');
const scoreBoardContainer = document.getElementById('scoreBoardContainer');

// 設定モーダル要素
const setupModal = document.getElementById('setup-modal');
const gameContainer = document.getElementById('game-container');
const playerCountSelect = document.getElementById('playerCount');
const playerNamesContainer = document.getElementById('playerNamesContainer');
const applySetupBtn = document.getElementById('applySetupBtn');

// 設定：カード枚数設定領域
const cardSetupArea = document.getElementById('cardSetupArea');
const pairsCountSpan = document.getElementById('pairsCount');
const totalCardsCountSpan = document.getElementById('totalCardsCount');
const setupErrorMessage = document.getElementById('setupErrorMessage');
const themeToggleBtn = document.getElementById('themeToggleBtn');
let cardSettings = {};

// 魔法要素
const magicBoardContainer = document.getElementById('magic-board-container');
const magicConfirmModal = document.getElementById('magic-confirm-modal');
const magicConfirmTitle = document.getElementById('magic-confirm-title');
const magicConfirmDesc = document.getElementById('magic-confirm-desc');
const executeMagicBtn = document.getElementById('executeMagicBtn');
const cancelMagicBtn = document.getElementById('cancelMagicBtn');

const magoModal = document.getElementById('mago-modal');
const magoModalContent = document.getElementById('mago-modal-content');
const newOshiSelect = document.getElementById('newOshiSelect');
const applyMagoBtn = document.getElementById('applyMagoBtn');
const peekBoardBtn = document.getElementById('peekBoardBtn');

const CHARACTER_IMAGES = {
    "桜羽エマ": "img/01_ema.png",
    "二階堂ヒロ": "img/02_hiro.png",
    "夏目アンアン": "img/03_anan.png",
    "城ケ崎ノア": "img/04_noa.png",
    "蓮見レイア": "img/05_reia.png",
    "佐伯ミリア": "img/06_miria.png",
    "宝生マーゴ": "img/07_mago.png",
    "黒部ナノカ": "img/08_nanoka.png",
    "紫藤アリサ": "img/09_arisa.png",
    "橘シェリー": "img/10_shelly.png",
    "遠野ハンナ": "img/11_hanna.png",
    "沢渡ココ": "img/12_koko.png",
    "氷上メルル": "img/13_meruru.png"
};
const GOKUCHO = "ゴクチョー";
const GOKUCHO_IMAGE = "img/99_gokucho.png";
const YUKI = "月代ユキ";
const YUKI_IMAGE = "img/98_yuki.png";

const MAGICS = {
    "沢渡ココ（千里眼）": { desc: "1枚だけカードの中身を確認する", id: "coco" },
    "橘シェリー（怪力）": { desc: "場にある裏向きのカードをシャッフルする", id: "shelley" },
    "宝生マーゴ（モノマネ）": { desc: "自分のポイント2倍カード（推し）を変更する", id: "mago" },
    "佐伯ミリア（入れ替わり）": { desc: "裏向きのカード2枚の位置を入れ替える", id: "miria" },
    "氷上メルル（治癒）": { desc: "1枚カードをめくった直後のみ使用可能。引いたカードをキャンセルしてもう一度引き直せる。", id: "meruru" },
    "サバトの儀式": { desc: "一巡(プレイヤー数分)の間、すべてのゴクチョーが月代ユキに変化します。\n月代ユキを揃えると+2ポイントを獲得してターンが終了します。", id: "sabbath" }
};

// 効果音
const turnSound = new Audio('SE/turn.mp3');
const seeSound = new Audio('SE/see.mp3');
const shuffleSound = new Audio('SE/shuffle.mp3');
const changeSound = new Audio('SE/change.mp3');
const daipanSound = new Audio('SE/daipan.mp3');
const bellSound = new Audio('SE/bell.mp3');

// BGM
const bgmAudio = new Audio('BGM/AccUhEarts-発-.mp3');
bgmAudio.loop = true;

let isMuted = false;
let globalSeVolume = 0.5;
let globalBgmVolume = 0.1;

function playSound(audioEl) {
    if (!audioEl || isMuted) return;
    audioEl.volume = globalSeVolume;
    audioEl.currentTime = 0;
    audioEl.play().catch(e => { /* ブラウザの自動再生制限などを無視 */ });
}

// =========================================================
// ゲームの主要状態（ステート）管理変数
// =========================================================
let players = [];            // 参加プレイヤー情報の配列 { name: "Player 1", score: 0, bonusChar: "...", usedMagics: [] }
let currentPlayerIndex = 0;  // 現在ターンを回しているプレイヤーのインデックス（0 = Player 1）
let matchedPairs = 0;        // 現在までに揃ったペアの数（終了判定に使用）
let firstCard = null;        // ターン中に1枚目に引いたカードのDOM要素
let secondCard = null;       // ターン中に2枚目に引いたカードのDOM要素
let boardLock = false;       // trueの間は一時的にカードのクリックを無効化する処理ロックフラグ
let isGameActive = false;    // 設定画面等ではなく、実際にゲームが進行中かどうか
let allCardsData = [];       // 盤面にあるすべてのカード情報（{ element: card, value: value, matched: false }）

// =========================================================
// 魔法システム専用の状態管理変数
// =========================================================
let currentSelectedMagicButton = null; // 現在どの魔法ボタンを選択中か（DOM要素）
let currentSelectedMagicKey = null;    // 現在発動を確認している魔法のID（"沢渡ココ" など）

/**
 * 魔法進行ステート (magicState)
 * 0: 通常状態（何も魔法を使っていない）
 * 1: 沢渡ココの発動待ち（対象となる1枚目のカードクリックを待っている状態）
 * 2: 佐伯ミリアの発動待ち1段階目（入れ替える対象の1枚目カードクリック待ち）
 * 3: 佐伯ミリアの発動待ち2段階目（入れ替える対象の2枚目カードクリック待ち）
 */
let magicState = 0;
let miriaFirstCard = null;             // 佐伯ミリア魔法発動時に選択した1枚目のカードを一時保存

// =========================================================
// サバトの儀式（特殊ルール）専用の状態管理変数
// =========================================================
let isSabbathEnabled = false;       // 設定画面でサバトの儀式がONになっているか
let sabbathActive = false;          // 現在サバトの儀式の効果が発動中か
let sabbathTurnsRemaining = 0;      // サバトの儀式の残り効果ターン数

// =========================================================
// セットアップとモーダル制御
// =========================================================

function renderPlayerNameInputs() {
    const count = parseInt(playerCountSelect.value, 10);
    playerNamesContainer.innerHTML = '';

    const chars = Object.keys(CHARACTER_IMAGES);

    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'player-setup-item';

        const label = document.createElement('label');
        label.textContent = `プレイヤー ${i + 1} の設定:`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `playerName${i}`;
        input.value = `Player ${i + 1}`;
        input.placeholder = "名前";

        const colorLabel = document.createElement('span');
        colorLabel.textContent = " 色: ";
        colorLabel.style.fontSize = "0.9em";
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = `playerColor${i}`;
        // デフォルトのプレイヤーカラー（ユーザー指定）
        const defaultColors = ["#007bff", "#dc3545", "#28a745", "#ffc107"];
        colorInput.value = defaultColors[i % 4];
        colorInput.style.marginLeft = '5px';
        colorInput.style.cursor = 'pointer';

        const select = document.createElement('select');
        select.id = `playerBonus${i}`;
        select.style.display = 'block';
        select.style.marginTop = '8px';
        
        const defaultCharIndex = i % chars.length;

        chars.forEach((char, index) => {
            const option = document.createElement('option');
            option.value = char;
            option.textContent = `推し: ${char} (2倍)`;
            if (index === defaultCharIndex) option.selected = true;
            select.appendChild(option);
        });

        div.appendChild(label);
        div.appendChild(input);
        div.appendChild(colorLabel);
        div.appendChild(colorInput);
        div.appendChild(select);
        playerNamesContainer.appendChild(div);
    }
}

/**
 * 構成するカードの枚数設定入力を生成します。
 */
function initializeCardSettings() {
    cardSetupArea.innerHTML = '';
    cardSettings = {};

    const chars = Object.keys(CHARACTER_IMAGES);
    chars.push(GOKUCHO);

    const default4Chars = ["沢渡ココ", "佐伯ミリア", "夏目アンアン", "宝生マーゴ", "橘シェリー", "遠野ハンナ", "氷上メルル"];

    chars.forEach(char => {
        let defaultCount = 0;
        if (char === GOKUCHO) {
            defaultCount = 2;
        } else if (default4Chars.includes(char)) {
            defaultCount = 4;
        }

        cardSettings[char] = defaultCount;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';

        const label = document.createElement('label');
        label.textContent = char;
        label.style.fontSize = '0.9em';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '2'; // ペア制のため2枚単位
        input.value = defaultCount;
        input.style.width = '60px';
        input.style.padding = '5px';

        input.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            // 片方だけにならないよう偶数に補正
            if (val % 2 !== 0) val += 1;
            e.target.value = val;

            cardSettings[char] = val;
            updateCardTotals();
        });

        row.appendChild(label);
        row.appendChild(input);
        cardSetupArea.appendChild(row);
    });

    updateCardTotals();
}

/**
 * ペア数とカード総数を計算してUIを更新し、不正な設定（0枚など）を防ぎます。
 */
function updateCardTotals() {
    let totalCards = 0;
    let gokuchoCount = 0;

    for (let [char, count] of Object.entries(cardSettings)) {
        totalCards += count;
        if (char === GOKUCHO) {
            gokuchoCount += count;
        }
    }
    const pairs = totalCards / 2;
    pairsCountSpan.textContent = pairs;
    totalCardsCountSpan.textContent = totalCards;

    // ゲーム成立のバリデーション
    if (totalCards === 0) {
        setupErrorMessage.textContent = "カードの枚数を設定してください";
        applySetupBtn.disabled = true;
    } else if (totalCards === gokuchoCount) {
        setupErrorMessage.textContent = "ゴクチョー以外のカードも選んでください";
        applySetupBtn.disabled = true;
    } else {
        setupErrorMessage.textContent = "";
        applySetupBtn.disabled = false;
    }
}

/**
 * 初期設定画面から「ゲームスタート」を押した際の処理。
 * プレイヤー数に合わせて内部データを初期化し、ゲーム画面へ遷移します。
 */
function applySetup() {
    const count = parseInt(playerCountSelect.value, 10);
    isSabbathEnabled = document.getElementById('enableSabbathCheckbox').checked;

    players = [];
    for (let i = 0; i < count; i++) {
        const name = document.getElementById(`playerName${i}`).value || `Player ${i + 1}`;
        const bonusChar = document.getElementById(`playerBonus${i}`).value;
        const color = document.getElementById(`playerColor${i}`).value;
        players.push({
            name: name,
            score: 0,
            bonusChar: bonusChar,
            usedMagics: [],
            color: color
        });
    }

    setupModal.style.display = 'none';      // 設定モーダルを隠す
    gameContainer.style.display = 'block';  // まのさばのゲーム盤を表示

    createScoreBoard();
    initializeSabbathBoard();
    startGame();
}

/**
 * 画面上部のプレイヤー情報・スコアボードUIを動的に生成します。
 */
function createScoreBoard() {
    scoreBoardContainer.innerHTML = '';
    players.forEach((player, index) => {
        const div = document.createElement('div');
        div.id = `p${index}-score-box`;
        div.className = `score-box`;
        // カスタムプロパティを設定して色を適用
        div.style.setProperty('--p-color', player.color);

        const mainScore = document.createElement('div');
        mainScore.innerHTML = `${player.name}: <span id="p${index}ScoreDisplay">0pt</span>`;

        const bonusInfo = document.createElement('div');
        bonusInfo.id = `p${index}-bonus-info`;
        bonusInfo.className = 'bonus-info';
        bonusInfo.textContent = `推し: ${player.bonusChar}`;

        div.appendChild(mainScore);
        div.appendChild(bonusInfo);

        scoreBoardContainer.appendChild(div);
    });
}

// === 魔法システム実装 ===

function initializeMagicBoard() {
    magicBoardContainer.innerHTML = '';
    const magicKeys = [
        "沢渡ココ（千里眼）", "沢渡ココ（千里眼）",
        "橘シェリー（怪力）", "橘シェリー（怪力）",
        "宝生マーゴ（モノマネ）", "宝生マーゴ（モノマネ）",
        // "佐伯ミリア（入れ替わり）", "佐伯ミリア（入れ替わり）",
        "氷上メルル（治癒）", "氷上メルル（治癒）"
    ];

    magicKeys.forEach((key, index) => {
        const btn = document.createElement('button');
        btn.className = 'magic-board-btn';
        btn.textContent = key;
        btn.dataset.magicKey = key;
        btn.dataset.tooltip = MAGICS[key].desc; // CSS用カスタムツールチップ

        btn.addEventListener('click', () => {
            if (!isGameActive) return;
            // 既に誰かに使われた、または自分のターン進行中（一時無効状態）の場合は何もしない
            if (btn.classList.contains('magic-turn-disabled') || Array.from(btn.classList).some(c => c.startsWith('magic-used-'))) return;

            // プレイヤーが既に同じ魔法を使用済みの場合は弾く
            if (players[currentPlayerIndex].usedMagics.includes(key)) {
                messageDisplay.textContent = `【エラー】同じ魔法「${key}」は1ゲーム中1回までです！`;
                return;
            }

            currentSelectedMagicKey = key;
            currentSelectedMagicButton = btn;
            showMagicConfirm(key);
        });

        magicBoardContainer.appendChild(btn);
    });
}

function initializeSabbathBoard() {
    const sabbathContainer = document.getElementById('sabbath-board-container');
    sabbathContainer.innerHTML = '';

    // 状態をリセット
    sabbathActive = false;
    sabbathTurnsRemaining = 0;

    if (!isSabbathEnabled) {
        sabbathContainer.style.display = 'none';
        return;
    }

    sabbathContainer.style.display = 'block';

    const btn = document.createElement('button');
    btn.id = 'sabbathTriggerBtn';
    btn.className = 'magic-board-btn';
    btn.style.width = '100%';
    btn.style.marginTop = '10px';
    btn.style.backgroundColor = '#800000'; // 暗い赤ベース
    btn.style.color = '#fff';
    btn.style.borderColor = '#ff4d4d';
    btn.style.fontWeight = 'bold';
    btn.textContent = 'サバトの儀式を実行（1ゲーム中1回のみ）';
    btn.dataset.tooltip = '一巡(プレイヤー数分)の間、すべてのゴクチョーが月代ユキに変化します。\n月代ユキを揃えると+2ポイントを獲得してターンが終了します。';

    btn.addEventListener('click', () => {
        if (!isGameActive || boardLock) return;
        // 1回きりの制限（ボタンが既に無効化されていれば弾く）
        if (btn.disabled) return;

        currentSelectedMagicKey = "サバトの儀式";
        currentSelectedMagicButton = btn;
        showMagicConfirm(currentSelectedMagicKey);
    });

    sabbathContainer.appendChild(btn);
}

/**
 * 魔法ボタンの有効/無効状態（UI表現）を更新します。
 * ゲームの進行状況（ターンロック中など）や、プレイヤーの使用履歴に基づいて押下可否を切り替えます。
 */
function updateMagicUI() {
    if (!isGameActive) return;

    const btns = magicBoardContainer.querySelectorAll('.magic-board-btn');
    // アニメーション中や他の魔法を実行中以外は「いつでも（1枚引いた状態でも）」使用可能とする
    const isTemporarilyLocked = (magicState !== 0 || boardLock === true);

    btns.forEach(btn => {
        const key = btn.dataset.magicKey;
        const playerAlreadyUsedThis = players[currentPlayerIndex].usedMagics.includes(key);

        if (key === "氷上メルル（治癒）") {
            // メルルのみ：1枚目のカードが引かれていて、2枚目が引かれていない（かつロック中ではない）状態でのみ利用可能
            if (!firstCard || secondCard || isTemporarilyLocked || playerAlreadyUsedThis) {
                btn.classList.add('magic-turn-disabled');
            } else {
                btn.classList.remove('magic-turn-disabled');
            }
        } else {
            // その他の既存の魔法は従来の条件（一時ロック中か使用済みの場合は無効）
            if (isTemporarilyLocked || playerAlreadyUsedThis) {
                btn.classList.add('magic-turn-disabled');
            } else {
                btn.classList.remove('magic-turn-disabled');
            }
        }
    });
}

function showMagicConfirm(magicKey) {
    if (magicKey === "サバトの儀式") {
        magicConfirmTitle.textContent = `${magicKey} を実行しますか？`;
        executeMagicBtn.textContent = '実行する！';
    } else {
        magicConfirmTitle.textContent = `${magicKey} の魔法を発動しますか？`;
        executeMagicBtn.textContent = '発動する！';
    }

    magicConfirmDesc.textContent = MAGICS[magicKey].desc;
    magicConfirmModal.style.display = 'flex';
}

function executeMagic() {
    magicConfirmModal.style.display = 'none';
    const key = currentSelectedMagicKey;

    if (key === "サバトの儀式") {
        activateSabbathRitual(currentSelectedMagicButton);
        return; // 通常の魔法処理には進まない
    }

    // 使用済みとして現在のプレイヤーの色にタグ付けし、使用履歴に追加
    currentSelectedMagicButton.classList.add(`magic-used-btn`);
    currentSelectedMagicButton.style.backgroundColor = players[currentPlayerIndex].color;
    currentSelectedMagicButton.style.borderColor = players[currentPlayerIndex].color;
    currentSelectedMagicButton.style.color = '#ffffff';
    currentSelectedMagicButton.textContent = `${key} ✔`;
    players[currentPlayerIndex].usedMagics.push(key);

    updateMagicUI();

    const currentPlayerName = players[currentPlayerIndex].name;

    if (key === "沢渡ココ（千里眼）") {
        messageDisplay.textContent = `${currentPlayerName}が「沢渡ココ（千里眼）の魔法」を発動！確認したいカードを1枚選んでください。`;
        magicState = 1;
        document.body.classList.add('magic-standby-coco');
    } else if (key === "橘シェリー（怪力）") {
        playSound(daipanSound);
        messageDisplay.textContent = `${currentPlayerName}が「橘シェリー（怪力）の魔法」を発動！場をシャッフルしました！`;
        executeShelleyMagic();
    } else if (key === "宝生マーゴ（モノマネ）") {
        messageDisplay.textContent = `${currentPlayerName}が「宝生マーゴ（モノマネ）の魔法」を発動！推しを変更します。`;
        openMagoModal();
    } else if (key === "佐伯ミリア（入れ替わり）") {
        messageDisplay.textContent = `${currentPlayerName}が「佐伯ミリア（入れ替わり）の魔法」を発動！入れ替えたいカードを2枚選んでください。 (1枚目を選択中)`;
        magicState = 2;
        miriaFirstCard = null;
        document.body.classList.add('magic-standby-miria');
    } else if (key === "氷上メルル（治癒）") {
        if (!firstCard) {
            messageDisplay.textContent = `【エラー】メルルの魔法は1枚カードをめくった状態でのみ使用可能です！`;
        } else {
            playSound(seeSound);
            messageDisplay.textContent = `${currentPlayerName}が「氷上メルル（治癒）の魔法」を発動！引いたカードをキャンセルし、引き直します。`;
            firstCard.classList.remove('flipped');
            firstCard = null; // 状態をリセット
            updateMagicUI();  // 魔法UIのボタン状態（メルルボタン等）を1枚目リセットに合わせて更新
        }
    }
}

/**
 * ミリアの魔法などで盤面のカードがシャッフルされた際に呼ばれる関数。
 * DOM要素の並びは変えず、中のデータ（キャラクターID）のみを差し替えて疑似シャッフルを行う。
 */
function executeShelleyMagic() {
    const unmatchedCards = Array.from(document.querySelectorAll('.card:not(.matched)'));

    boardLock = true; // シャッフル中は他の操作を無効化

    // 1. 台パン風にカードを乱雑に散らすアニメーション（激しく飛ぶバージョン）
    unmatchedCards.forEach(card => {
        // カードの大きさは変えず（scale=1）、移動距離を大幅に拡大（-300px ～ +300px）
        const dx = (Math.random() - 0.5) * 600;
        const dy = (Math.random() - 0.5) * 600;
        const rot = (Math.random() - 0.5) * 360;

        // より勢いよく飛び出し、少し強く弾むイージング
        card.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        card.style.zIndex = Math.floor(50 + Math.random() * 50); // 重なり順もランダムにして立体感を出す
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(1)`;
    });

    // 2. しばらく散らかった状態を見せた後、データを入れ替えて定位置に戻す
    setTimeout(() => {
        playSound(shuffleSound); // 整列し直すときのサウンド

        let values = unmatchedCards.map(c => c.dataset.value);
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        unmatchedCards.forEach((card, i) => {
            card.dataset.value = values[i];
            const imgEl = card.querySelector('.card-front img');
            if (values[i] === GOKUCHO) {
                imgEl.src = GOKUCHO_IMAGE;
                card.querySelector('.card-front').classList.add('gokucho-style');
            } else {
                imgEl.src = CHARACTER_IMAGES[values[i]];
                card.querySelector('.card-front').classList.remove('gokucho-style');
            }

            // 綺麗に定位置に戻るためのアニメーションを設定
            card.style.transition = 'transform 0.6s ease-in-out';
            card.style.transform = 'translate(0px, 0px) rotate(0deg) scale(1)';
        });

        // 3. 戻るアニメーション（0.6秒）が完了したらスタイルを完全クリア
        setTimeout(() => {
            unmatchedCards.forEach(card => {
                card.style.transition = ''; // CSSのデフォルトへ戻す
                card.style.transform = '';
                card.style.zIndex = '';
            });
            boardLock = false; // ボードロック解除
            updateMagicUI();
        }, 600);

    }, 1200); // 1.2秒間散らかった状態を維持
}

// マーゴ：推し変更処理
function openMagoModal() {
    newOshiSelect.innerHTML = '';
    Object.keys(CHARACTER_IMAGES).forEach(char => {
        // 設定されていない（0枚）キャラクターは選択肢から除外する
        if (!cardSettings[char] || cardSettings[char] <= 0) return;

        let remaining = getRemainingCount(char);

        const option = document.createElement('option');
        option.value = char;
        option.textContent = `${char} (残り: ${remaining}枚)`;
        
        if (char === players[currentPlayerIndex].bonusChar) {
            option.selected = true;
        }
        newOshiSelect.appendChild(option);
    });
    magoModal.style.display = 'flex';
}

function applyMagoMagic() {
    playSound(changeSound);
    const newChar = newOshiSelect.value;
    players[currentPlayerIndex].bonusChar = newChar;
    document.getElementById(`p${currentPlayerIndex}-bonus-info`).textContent = `推し: ${newChar}`;
    magoModal.style.display = 'none';
    messageDisplay.textContent = `推しを「${newChar}」に変更しました！通常通りカードを引いてください。`;
}


// =========================================================
// ゲームロジック・カード操作
// =========================================================

/**
 * 使用するカード配列（ユーザー設定枚数ベース）を生成し、ランダムにシャッフルして返却。
 */
function generateAndShuffleCards() {
    let values = [];
    Object.keys(cardSettings).forEach(char => {
        const count = cardSettings[char];
        for (let i = 0; i < count; i++) {
            values.push(char);
        }
    });

    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}

function createBoard(values) {
    gameBoard.innerHTML = '';
    allCardsData = [];

    const totalCards = values.length;
    if (totalCards === 0) return; // カード0枚のときは生成しない

    // 適切な列数を計算（最大10列目安）
    let cols = Math.ceil(Math.sqrt(totalCards));
    if (cols > 10) cols = 10;
    // CSS変数を設定し、要素幅に合わせて動的にグリッド比率を変更する
    gameBoard.style.setProperty('--dynamic-cols', cols);

    const columns = [];
    for (let i = 0; i < cols; i++) {
        columns.push(String.fromCharCode(65 + i)); // A, B, C...
    }
    const rows = Math.ceil(totalCards / cols);

    // 左上の空白
    const emptyCorner = document.createElement('div');
    emptyCorner.className = 'grid-label-corner';
    gameBoard.appendChild(emptyCorner);

    // 列ラベル（A〜）
    columns.forEach(col => {
        const label = document.createElement('div');
        label.className = 'grid-label col-label';
        label.textContent = col;
        gameBoard.appendChild(label);
    });

    let cardIndex = 0;
    // 各行ごとに処理
    for (let row = 1; row <= rows; row++) {
        // 行ラベル（1〜）
        const rLabel = document.createElement('div');
        rLabel.className = 'grid-label row-label';
        rLabel.textContent = row;
        gameBoard.appendChild(rLabel);

        // 各行のカード配置
        for (let col = 0; col < cols; col++) {
            const cardWrap = document.createElement('div');

            if (cardIndex >= values.length) {
                // 総数が列の倍数でない場合の空きマス用
                cardWrap.style.visibility = 'hidden';
                gameBoard.appendChild(cardWrap);
                continue;
            }

            const value = values[cardIndex];

            cardWrap.classList.add('card');
            cardWrap.dataset.value = value;
            cardWrap.dataset.index = cardIndex;

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-face', 'card-front');
            if (value === GOKUCHO) cardFront.classList.add('gokucho-style');

            const imgEl = document.createElement('img');
            if (value === GOKUCHO) {
                imgEl.src = GOKUCHO_IMAGE;
            } else {
                imgEl.src = CHARACTER_IMAGES[value];
            }
            cardFront.appendChild(imgEl);

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-face', 'card-back');

            cardWrap.appendChild(cardFront);
            cardWrap.appendChild(cardBack);

            cardWrap.addEventListener('click', flipCard);
            gameBoard.appendChild(cardWrap);

            allCardsData.push({ element: cardWrap, value: value, matched: false });
            cardIndex++;
        }
    }
}

function flipCard(event) {
    if (!isGameActive || boardLock) return;

    const card = event.currentTarget;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

    if (magicState !== 0) {
        handleMagicCardClick(card);
        return;
    }

    playSound(turnSound);
    card.classList.add('flipped');

    if (!firstCard) {
        firstCard = card;
        updateMagicUI();
        return;
    }

    secondCard = card;
    boardLock = true;

    checkForMatch();
}

function handleMagicCardClick(card) {
    if (magicState === 1) {
        playSound(seeSound);
        document.body.classList.remove('magic-standby-coco');
        boardLock = true;
        card.classList.add('flipped');
        setTimeout(() => {
            card.classList.remove('flipped');
            boardLock = false;
            magicState = 0;
            messageDisplay.textContent = `カードの中身を確認しました！通常通りカードを引いてください。`;
            updateMagicUI();
        }, 1500);

    } else if (magicState === 2) {
        miriaFirstCard = card;
        card.style.borderColor = '#ff00ff';
        card.style.borderWidth = '3px';
        magicState = 3;
        messageDisplay.textContent = `入れ替えたいカードをもう1枚（2枚目）選んでください。`;

    } else if (magicState === 3) {
        if (card === miriaFirstCard) return;

        document.body.classList.remove('magic-standby-miria');
        const card1 = miriaFirstCard;
        const card2 = card;

        boardLock = true; // アニメーション中はロック
        playSound(shuffleSound);

        // --- 座標計算とアニメーション開始 ---
        const rect1 = card1.getBoundingClientRect();
        const rect2 = card2.getBoundingClientRect();

        const dx1 = rect2.left - rect1.left;
        const dy1 = rect2.top - rect1.top;
        const dx2 = rect1.left - rect2.left;
        const dy2 = rect1.top - rect2.top;

        // 元のflip用transitionを上書きして移動用アニメーションを設定
        card1.style.transition = 'transform 0.5s ease-in-out';
        card2.style.transition = 'transform 0.5s ease-in-out';
        card1.style.zIndex = '100'; // 他のカードより前面に出す
        card2.style.zIndex = '100';

        // 相手の物理座標へ視覚的に移動させる
        card1.style.transform = `translate(${dx1}px, ${dy1}px)`;
        card2.style.transform = `translate(${dx2}px, ${dy2}px)`;

        // --- 500ms(移動アニメーション)後にデータ入れ替えと位置リセット ---
        setTimeout(() => {
            // スワップ処理
            const tempValue = card1.dataset.value;
            card1.dataset.value = card2.dataset.value;
            card2.dataset.value = tempValue;

            const tempSrc = card1.querySelector('img').src;
            card1.querySelector('img').src = card2.querySelector('img').src;
            card2.querySelector('img').src = tempSrc;

            toggleGokuchoStyle(card1, card1.dataset.value);
            toggleGokuchoStyle(card2, card2.dataset.value);

            card1.style.borderColor = '';
            card1.style.borderWidth = ''; // 1枚目選択枠削除

            // アニメーション用のスタイルを全て解除する（位置が元に戻る）
            card1.style.transition = 'none';
            card2.style.transition = 'none';
            card1.style.transform = '';
            card2.style.transform = '';
            card1.style.zIndex = '';
            card2.style.zIndex = '';

            // 強制reflow（一瞬だけtransition: noneを適用させるため）
            void card1.offsetWidth;

            // CSS定義の元のtransition（flip用など）に戻す
            card1.style.transition = '';
            card2.style.transition = '';

            magicState = 0;
            miriaFirstCard = null;
            boardLock = false;
            messageDisplay.textContent = `2枚のカードの位置を入れ替えました！通常通りカードを引いてください。`;

            updateMagicUI();
        }, 500);
    }
}

function toggleGokuchoStyle(card, value) {
    const front = card.querySelector('.card-front');
    if (value === GOKUCHO) {
        front.classList.add('gokucho-style');
    } else {
        front.classList.remove('gokucho-style');
    }
}

function checkForMatch() {
    const char1 = firstCard.dataset.value;
    const char2 = secondCard.dataset.value;
    const isMatch = (char1 === char2);

    if (isMatch) {
        matchCards(char1);
    } else {
        unflipCards();
    }
}

function matchCards(char) {
    firstCard.style.setProperty('--p-color', players[currentPlayerIndex].color);
    secondCard.style.setProperty('--p-color', players[currentPlayerIndex].color);
    firstCard.classList.add('matched', 'custom-matched');
    secondCard.classList.add('matched', 'custom-matched');

    const index1 = parseInt(firstCard.dataset.index);
    const index2 = parseInt(secondCard.dataset.index);
    allCardsData[index1].matched = true;
    allCardsData[index2].matched = true;

    matchedPairs++;

    if (char === GOKUCHO) {
        players[currentPlayerIndex].score = Math.max(0, players[currentPlayerIndex].score - 3);
        messageDisplay.textContent = 'ゴクチョー！ -3ポイント（強制ターン交代）';
    } else if (char === YUKI) {
        players[currentPlayerIndex].score += 2;
        messageDisplay.textContent = '月代ユキ！ +2ポイント獲得！（ターン交代）';
    } else {
        if (char === players[currentPlayerIndex].bonusChar) {
            players[currentPlayerIndex].score += 4;
            messageDisplay.textContent = '推しキャラボーナス発動！✨ +4ポイント！（もう一度）';
        } else {
            players[currentPlayerIndex].score += 2;
            messageDisplay.textContent = 'マッチ！ +2ポイント（もう一度カードを引けます）';
        }
    }

    updateScoreDisplay();

    setTimeout(() => {
        resetBoard();

        if (char === GOKUCHO || char === YUKI) {
            if (players.length > 1) {
                switchTurn();
            } else {
                handleTurnEnd(); // 1人プレイ時のターン消費
                messageDisplay.textContent = `${players[0].name}のターン`;
                updateMagicUI();
            }
        }
        else {
            updateMagicUI();
        }
        checkGameEnd();
    }, 1000);
}

function unflipCards() {
    messageDisplay.textContent = '不一致... ターン交代します';
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');

        resetBoard();

        if (players.length > 1) {
            switchTurn();
        } else {
            handleTurnEnd(); // 1人プレイ時のターン消費
            messageDisplay.textContent = `${players[0].name}のターン`;
            updateMagicUI();
        }
    }, 1000);
}

function resetBoard() {
    firstCard = null;
    secondCard = null;
    boardLock = false;
}

function handleTurnEnd() {
    if (sabbathActive) {
        sabbathTurnsRemaining--;
        if (sabbathTurnsRemaining <= 0) {
            deactivateSabbathRitual();
        }
    }
}

function switchTurn() {
    handleTurnEnd();
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

    players.forEach((player, index) => {
        const box = document.getElementById(`p${index}-score-box`);
        if (index === currentPlayerIndex) {
            box.classList.add(`active-player`);
        } else {
            box.classList.remove(`active-player`);
        }
    });

    messageDisplay.textContent = `${players[currentPlayerIndex].name} のターン`;
    updateMagicUI();
}

function updateScoreDisplay() {
    players.forEach((player, index) => {
        document.getElementById(`p${index}ScoreDisplay`).textContent = `${player.score}pt`;
    });
    updateRemainingCardsUI();
}

function getRemainingCount(char) {
    let count = 0;
    allCardsData.forEach(card => {
        // サバト中の「月代ユキ」も内部の元データ(GOKUCHO)または実態のYUKIで計算対象とする
        if (!card.matched) {
            let actualValue = card.value;
            // ユキに変身中のゴクチョーもゴクチョーとしてカウントするか、ユキとしてカウントするか。
            // 実態のvalueを判定
            if (actualValue === char) count++;
        }
    });
    return count;
}

function updateRemainingCardsUI() {
    const container = document.getElementById('remainingCardsContainer');
    if (!container) return;

    let htmlStrings = [];
    Object.keys(cardSettings).forEach(char => {
        if (cardSettings[char] > 0) {
            // サバト発動中はゴクチョーが月代ユキになるので表示名を切り替える
            let displayChar = char;
            if (sabbathActive && char === GOKUCHO) displayChar = YUKI;

            let remain = getRemainingCount(displayChar);
            // 0枚になったものもグレーアウトして表示するか、一覧から消すかは自由だが、今回はすべて表示して枚数を記載
            let colorStr = remain > 0 ? 'inherit' : '#999';
            htmlStrings.push(`<span style="margin: 0 5px; display: inline-block; color: ${colorStr}">${displayChar}: ${remain}</span>`);
        }
    });
    container.innerHTML = '【残りカード】<br>' + htmlStrings.join('');
}

function checkGameEnd() {
    const unmatchedCards = allCardsData.filter(c => !c.matched);

    let isOver = false;
    let endMessage = "";

    if (unmatchedCards.length === 0) {
        isOver = true;
        endMessage = "すべてのカードが揃いました！";
    } else if (unmatchedCards.every(c => c.element.dataset.value === GOKUCHO)) {
        isOver = true;
        endMessage = "ゴクチョーのみ残ったため、ゲーム終了！";
    }

    if (isOver) {
        gameClear(endMessage);
    }
}

function gameClear(reason) {
    isGameActive = false;
    resetButton.disabled = false;
    resetButton.textContent = 'もう一度プレイ';

    let winnerText = "";
    if (players.length > 1) {
        let maxScore = -Infinity;
        for (let p of players) {
            if (p.score > maxScore) maxScore = p.score;
        }
        const winners = players.filter(p => p.score === maxScore).map(p => p.name);

        if (winners.length === 1) {
            winnerText = `${winners[0]} の勝利！ 🎉`;
        } else {
            winnerText = `引き分け！ (${winners.join(', ')}) 🤝`;
        }
    } else {
        winnerText = `最終スコア: ${players[0].score}`;
    }

    messageDisplay.textContent = `${reason} ${winnerText}`;
}

// === 初期化処理 ===

function initializeGame() {
    // 音量制御関連要素取得
    const muteBtn = document.getElementById('muteBtn');
    const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
    const seVolumeSlider = document.getElementById('seVolumeSlider');

    // BGM初期音量
    bgmAudio.volume = globalBgmVolume;

    // 音量イベントリスナー
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        bgmAudio.muted = isMuted;
    });

    bgmVolumeSlider.addEventListener('input', (e) => {
        globalBgmVolume = parseFloat(e.target.value);
        bgmAudio.volume = globalBgmVolume;
        checkMuteState(muteBtn);
    });

    seVolumeSlider.addEventListener('input', (e) => {
        globalSeVolume = parseFloat(e.target.value);
        checkMuteState(muteBtn);
    });

    function checkMuteState(btn) {
        if (globalBgmVolume === 0 && globalSeVolume === 0) {
            isMuted = true;
            btn.textContent = '🔇';
            bgmAudio.muted = true;
        } else if (isMuted && (globalBgmVolume > 0 || globalSeVolume > 0)) {
            isMuted = false;
            btn.textContent = '🔊';
            bgmAudio.muted = false;
        }
    }

    playerCountSelect.addEventListener('change', renderPlayerNameInputs);
    applySetupBtn.addEventListener('click', applySetup);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }

    renderPlayerNameInputs();
    initializeCardSettings(); // カード設定UI初期描画

    openSettingsBtn.addEventListener('click', () => {
        if (isGameActive) {
            if (!confirm("設定画面を開くと現在のゲーム進行は失われます。よろしいですか？")) {
                return;
            }
        }
        isGameActive = false;
        if (!bgmAudio.paused) bgmAudio.pause(); // 音楽一時停止
        setupModal.style.display = 'flex';
        gameContainer.style.display = 'none';
    });

    resetButton.addEventListener('click', () => {
        if (!isGameActive) {
            resetGame();
        } else {
            if (confirm("現在のゲームをリセットして最初からやり直しますか？")) {
                resetGame();
            }
        }
    });

    cancelMagicBtn.addEventListener('click', () => magicConfirmModal.style.display = 'none');
    executeMagicBtn.addEventListener('click', executeMagic);
    applyMagoBtn.addEventListener('click', applyMagoMagic);

    // マーゴの「盤面を覗き込む」機能（長押し処理）
    const showPeek = () => {
        magoModal.style.backgroundColor = 'transparent';
        magoModalContent.style.opacity = '0.05'; // 完全透明にすると誤作動の元なので微小に残す
    };
    const hidePeek = () => {
        magoModal.style.backgroundColor = '';
        magoModalContent.style.opacity = '1';
    };

    peekBoardBtn.addEventListener('mousedown', showPeek);
    peekBoardBtn.addEventListener('mouseup', hidePeek);
    peekBoardBtn.addEventListener('mouseleave', hidePeek);

    // スマホ対応
    peekBoardBtn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); // スクロール等の他イベント防止
        showPeek(); 
    });
    peekBoardBtn.addEventListener('touchend', hidePeek);
    peekBoardBtn.addEventListener('touchcancel', hidePeek);
}

function startGame() {
    // BGM再生開始（ユーザー操作起因のため再生可能）
    if (bgmAudio.paused) {
        bgmAudio.play().catch(e => console.log('BGM Autoplay prevented', e));
    }

    isGameActive = true;
    magicState = 0;
    document.body.classList.remove('magic-standby-coco', 'magic-standby-miria');

    players.forEach(p => { p.score = 0; p.usedMagics = []; });
    currentPlayerIndex = players.length - 1;
    matchedPairs = 0;

    initializeMagicBoard();

    if (players.length > 1) {
        switchTurn();
    } else {
        currentPlayerIndex = 0;
        document.getElementById('p0-score-box').classList.add('active-p0');
        messageDisplay.textContent = `${players[0].name}のターン（ゲーム開始）`;
        updateMagicUI();
    }

    const shuffledValues = generateAndShuffleCards();
    createBoard(shuffledValues);

    updateScoreDisplay();
    resetBoard();

    resetButton.disabled = false;
    resetButton.textContent = 'リセット';
    if (players.length > 1) {
        messageDisplay.textContent = `${players[currentPlayerIndex].name} のターン（ゲーム開始）`;
    }
}

function resetGame() {
    // サバトの儀式のリセット
    sabbathActive = false;
    sabbathTurnsRemaining = 0;

    startGame();
    messageDisplay.textContent = 'ゲームをリセットしました。' + messageDisplay.textContent;
}

// =========================================================
// サバトの儀式（特殊ルール）ロジック
// =========================================================

function activateSabbathRitual(btn) {
    if (sabbathActive) return;

    playSound(bellSound); // 専用の鐘の音を使用
    btn.disabled = true;
    btn.textContent = 'サバトの儀式を実行 ✔';
    btn.classList.add('magic-used-btn');
    btn.style.opacity = '0.5';

    sabbathActive = true;
    sabbathTurnsRemaining = players.length; // 人数＝一巡

    messageDisplay.textContent = `【サバトの儀式 実行】今から一巡の間、すべてのゴクチョーが月代ユキに変わります！`;

    // 盤面の未マッチのゴクチョーを月代ユキに書き換える
    allCardsData.forEach(data => {
        if (!data.matched && data.value === GOKUCHO) {
            data.value = YUKI;
            data.element.dataset.value = YUKI;

            const imgEl = data.element.querySelector('.card-front img');
            imgEl.src = YUKI_IMAGE;

            toggleGokuchoStyle(data.element, YUKI);
        }
    });

    updateRemainingCardsUI();
}

function deactivateSabbathRitual() {
    sabbathActive = false;
    messageDisplay.textContent = `サバトの儀式の効果が切れました……月代ユキは再び姿を消しました。`;

    // 盤面の未マッチの月代ユキをゴクチョーに戻す
    allCardsData.forEach(data => {
        if (!data.matched && data.value === YUKI) {
            data.value = GOKUCHO;
            data.element.dataset.value = GOKUCHO;

            const imgEl = data.element.querySelector('.card-front img');
            imgEl.src = GOKUCHO_IMAGE;

            toggleGokuchoStyle(data.element, GOKUCHO);
        }
    });

    updateRemainingCardsUI();
}

window.onload = initializeGame;
