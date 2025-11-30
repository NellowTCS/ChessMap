import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm';

// "Settings"
let autoCenterActiveNode = false; // set true to enable auto-centering

let game = new Chess();
let gameHistory = [];
let maxDepthReached = 0;
let moveNodes = new Map();

// Pan and zoom state
let panX = 0;
let panY = 0;
let scale = 1;
let isDragging = false;
let startX = 0;
let startY = 0;

const board = Chessboard2('board', {
    position: game.fen(),
    draggable: false,
    orientation: 'white'
});

const moveTree = document.getElementById('moveTree');
const treeViewport = document.getElementById('treeViewport');
const treeCanvas = document.getElementById('treeCanvas');
const statusEl = document.getElementById('status');
const turnInfo = document.getElementById('turnInfo');
const moveCount = document.getElementById('moveCount');
const treeDepth = document.getElementById('treeDepth');
const panHint = document.querySelector('.pan-hint');

// Show pan hint initially
setTimeout(() => {
    panHint.classList.add('show');
    setTimeout(() => panHint.classList.remove('show'), 3000);
}, 500);

function updateTransform() {
    treeCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function resetView() {
    panX = 0;
    panY = 0;
    scale = 1;
    updateTransform();
}

// Mouse panning
treeViewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tree-node') || e.target.closest('button')) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    treeViewport.classList.add('grabbing');
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    treeViewport.classList.remove('grabbing');
});

// Touch panning
let touchStartX = 0;
let touchStartY = 0;

treeViewport.addEventListener('touchstart', (e) => {
    if (e.target.closest('.tree-node') || e.target.closest('button')) return;
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX - panX;
        touchStartY = e.touches[0].clientY - panY;
    }
});

treeViewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        e.preventDefault();
        panX = e.touches[0].clientX - touchStartX;
        panY = e.touches[0].clientY - touchStartY;
        updateTransform();
    }
});

// Zoom with mouse wheel
treeViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));

    // Zoom towards mouse position
    const rect = treeViewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleDiff = newScale - scale;
    panX -= (mouseX - panX) * scaleDiff / scale;
    panY -= (mouseY - panY) * scaleDiff / scale;

    scale = newScale;
    updateTransform();
});

// Zoom buttons
document.getElementById('zoomInBtn').addEventListener('click', () => {
    scale = Math.min(3, scale * 1.2);
    updateTransform();
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    scale = Math.max(0.5, scale / 1.2);
    updateTransform();
});

document.getElementById('resetViewBtn').addEventListener('click', resetView);

function updateGameInfo() {
    const moves = gameHistory.length;
    const turn = Math.floor(moves / 2) + 1;

    turnInfo.textContent = turn;
    moveCount.textContent = moves;
    treeDepth.textContent = maxDepthReached;

    if (game.isCheckmate()) {
        statusEl.textContent = `${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
        statusEl.style.background = '#28a745';
        statusEl.style.color = 'white';
    } else if (game.isDraw()) {
        statusEl.textContent = 'Game is a draw';
        statusEl.style.background = '#ffc107';
        statusEl.style.color = 'black';
    } else if (game.inCheck()) {
        statusEl.textContent = `${game.turn() === 'w' ? 'White' : 'Black'} is in check`;
        statusEl.style.background = '#dc3545';
        statusEl.style.color = 'white';
    } else {
        statusEl.textContent = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
        statusEl.style.background = '#e9ecef';
        statusEl.style.color = '#333';
    }

    document.getElementById('undoBtn').disabled = gameHistory.length === 0;
    document.getElementById('copyPgnBtn').disabled = gameHistory.length === 0;
}

function createMoveNode(move, fen, depth, parentContainer, pathToNode = []) {
    maxDepthReached = Math.max(maxDepthReached, depth);

    const nodeDiv = document.createElement('div');
    nodeDiv.className = `tree-node depth-${Math.min(depth, 10)}`;

    const testGame = new Chess(fen);
    const moveNumber = Math.floor(testGame.moveNumber()) + 1;
    const isWhite = testGame.turn() === 'w';

    const displayText = depth === 0 ?
        `${moveNumber}${isWhite ? '.' : '...'} ${move.san}` :
        move.san;

    const moveSpan = document.createElement('span');
    moveSpan.className = 'move-text';
    moveSpan.textContent = displayText;
    nodeDiv.appendChild(moveSpan);

    const infoSpan = document.createElement('span');
    infoSpan.className = 'move-info';
    const info = [];
    if (move.san.includes('#')) info.push('mate');
    else if (move.san.includes('+')) info.push('check');
    if (move.captured) info.push('capture');
    if (move.promotion) info.push('promotion');
    infoSpan.textContent = info.join(', ');
    nodeDiv.appendChild(infoSpan);

    testGame.move(move.san);
    const hasChildren = testGame.moves().length > 0 && !testGame.isGameOver();

    if (hasChildren) {
        nodeDiv.classList.add('expandable');
    }

    const fullPath = [...pathToNode, move.san];
    const nodeId = fullPath.join('-');
    nodeDiv.dataset.nodeId = nodeId;
    nodeDiv.dataset.fen = fen;
    nodeDiv.dataset.move = move.san;
    nodeDiv.dataset.depth = depth;

    moveNodes.set(nodeId, {
        element: nodeDiv,
        move: move,
        fen: fen,
        depth: depth,
        expanded: false,
        hasChildren: hasChildren,
        path: fullPath
    });

    nodeDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMoveClick(nodeId);
    });

    parentContainer.appendChild(nodeDiv);
    return nodeDiv;
}

function handleMoveClick(nodeId) {
    const nodeData = moveNodes.get(nodeId);
    if (!nodeData) return;

    if (nodeData.hasChildren && nodeData.element.classList.contains('expandable')) {
        toggleNodeExpansion(nodeId);
    }

    // Reset to start and replay the entire path
    game = new Chess();
    gameHistory = [];

    for (const moveSan of nodeData.path) {
        const moveObj = game.move(moveSan);
        if (moveObj) {
            gameHistory.push({
                fen: game.fen(),
                move: moveSan,
                moveObj: moveObj
            });
        }
    }

    board.setPosition(game.fen());
    updateGameInfo();

    document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
    nodeData.element.classList.add('active');

    if (autoCenterActiveNode) {
        const rect = nodeData.element.getBoundingClientRect();
        const viewportRect = treeViewport.getBoundingClientRect();
    
        const targetX = viewportRect.width / 2 - rect.left + viewportRect.left - rect.width / 2;
        const targetY = viewportRect.height / 2 - rect.top + viewportRect.top - rect.height / 2;
    
        panX += (targetX - panX) * 0.3;
        panY += (targetY - panY) * 0.3;
        updateTransform();
    }
}

function toggleNodeExpansion(nodeId) {
    const nodeData = moveNodes.get(nodeId);
    if (!nodeData || !nodeData.hasChildren) return;

    const childrenContainer = nodeData.element.nextElementSibling;

    if (nodeData.expanded) {
        if (childrenContainer && childrenContainer.classList.contains('tree-children')) {
            childrenContainer.classList.add('hidden');
        }
        nodeData.element.classList.remove('expanded');
        nodeData.expanded = false;
    } else {
        if (childrenContainer && childrenContainer.classList.contains('tree-children')) {
            childrenContainer.classList.remove('hidden');
        } else {
            expandNode(nodeId);
        }
        nodeData.element.classList.add('expanded');
        nodeData.expanded = true;
    }
}

function expandNode(nodeId) {
    const nodeData = moveNodes.get(nodeId);
    if (!nodeData || !nodeData.hasChildren) return;

    const newGame = new Chess(nodeData.fen);
    newGame.move(nodeData.move.san);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';

    nodeData.element.parentNode.insertBefore(childrenContainer, nodeData.element.nextSibling);

    const moves = newGame.moves({ verbose: true });

    moves.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (a.captured) scoreA += 10;
        if (b.captured) scoreB += 10;
        if (a.san.includes('+')) scoreA += 5;
        if (b.san.includes('+')) scoreB += 5;
        if (a.san.includes('#')) scoreA += 100;
        if (b.san.includes('#')) scoreB += 100;
        return scoreB - scoreA;
    });

    moves.forEach(move => {
        createMoveNode(move, newGame.fen(), nodeData.depth + 1, childrenContainer, nodeData.path);
    });
}

function generatePgn() {
    if (gameHistory.length === 0) {
        return "No moves played";
    }

    let pgn = "[Event \"Chess Move Tree Game\"]\n";
    pgn += `[Date \"${new Date().toISOString().split('T')[0]}\"]\n`;
    pgn += "[White \"Player\"]\n";
    pgn += "[Black \"Player\"]\n\n";

    let moveNumber = 1;
    let moveText = "";

    for (let i = 0; i < gameHistory.length; i++) {
        const historyEntry = gameHistory[i];
        const isWhiteMove = i % 2 === 0;

        if (isWhiteMove) {
            if (i > 0) moveText += " ";
            moveText += `${moveNumber}. ${historyEntry.move}`;
        } else {
            moveText += ` ${historyEntry.move}`;
            moveNumber++;
        }
    }

    pgn += moveText;

    if (game.isCheckmate()) {
        pgn += game.turn() === 'w' ? ' 0-1' : ' 1-0';
    } else if (game.isDraw() || game.isStalemate() || game.isInsufficientMaterial() || game.isThreefoldRepetition()) {
        pgn += ' 1/2-1/2';
    }

    return pgn;
}

function copyPgnToClipboard() {
    const pgn = generatePgn();
    const copyBtn = document.getElementById('copyPgnBtn');
    const notification = document.getElementById('copyNotification');

    navigator.clipboard.writeText(pgn).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.textContent = 'Copied!';
        notification.classList.add('show');

        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.textContent = 'Copy PGN';
            notification.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy PGN: ', err);
        const textArea = document.createElement('textarea');
        textArea.value = pgn;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy PGN', 2000);
        } catch (fallbackErr) {
            console.error('Fallback copy failed: ', fallbackErr);
        }
        document.body.removeChild(textArea);
    });
}

function initializeTree() {
    moveTree.innerHTML = '';
    moveNodes.clear();

    const moves = game.moves({ verbose: true });

    moves.sort((a, b) => {
        const openingMoves = ['e4', 'e5', 'd4', 'd5', 'Nf3', 'Nc6', 'Nf6', 'Nc3'];
        const scoreA = openingMoves.includes(a.san) ? 10 : 0;
        const scoreB = openingMoves.includes(b.san) ? 10 : 0;
        return scoreB - scoreA;
    });

    moves.forEach(move => {
        createMoveNode(move, game.fen(), 0, moveTree, []);
    });
}

function resetGame() {
    game = new Chess();
    gameHistory = [];
    maxDepthReached = 0;

    board.setPosition(game.fen());
    updateGameInfo();
    initializeTree();
    resetView();
}

function undoMove() {
    if (gameHistory.length > 0) {
        gameHistory.pop();

        game = new Chess();
        for (const entry of gameHistory) {
            game.move(entry.move);
        }

        board.setPosition(game.fen());
        updateGameInfo();

        document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
    }
}

function expandAll() {
    const expandBtn = document.getElementById('expandAllBtn');
    expandBtn.disabled = true;
    expandBtn.textContent = 'Expanding...';

    const expandableNodes = Array.from(moveNodes.values()).filter(node =>
        node.hasChildren && !node.expanded
    );

    let processed = 0;
    function expandNext() {
        if (processed >= expandableNodes.length) {
            expandBtn.disabled = false;
            expandBtn.textContent = 'Expand All';
            updateGameInfo();
            return;
        }

        const nodeData = expandableNodes[processed];
        const nodeId = Array.from(moveNodes.entries())
            .find(([_, data]) => data === nodeData)?.[0];

        if (nodeId) {
            toggleNodeExpansion(nodeId);
        }

        processed++;
        setTimeout(expandNext, 10);
    }

    expandNext();
}

function collapseAll() {
    moveNodes.forEach((nodeData, nodeId) => {
        if (nodeData.expanded) {
            toggleNodeExpansion(nodeId);
        }
    });
}

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('undoBtn').addEventListener('click', undoMove);
document.getElementById('copyPgnBtn').addEventListener('click', copyPgnToClipboard);
document.getElementById('expandAllBtn').addEventListener('click', expandAll);
document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'z':
                e.preventDefault();
                undoMove();
                break;
            case 'r':
                e.preventDefault();
                resetGame();
                break;
            case 'c':
                if (gameHistory.length > 0) {
                    e.preventDefault();
                    copyPgnToClipboard();
                }
                break;
        }
    }
});

initializeTree();
updateGameInfo();
