document.addEventListener('DOMContentLoaded', () => {
  // --- Google Search Handler ---
  const searchForm = document.getElementById('google-search-form');
  const searchInput = document.getElementById('google-search-input');

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    if (query.startsWith('http://') || query.startsWith('https://') || (query.includes('.') && !query.includes(' '))) {
      const url = query.startsWith('http') ? query : `https://${query}`;
      window.location.href = url;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });

  // --- Signature Gateway Pad ---
  const sigCanvas = document.getElementById('signature-pad');
  const ctx = sigCanvas.getContext('2d');
  const modal = document.getElementById('signature-modal');
  const mainContent = document.getElementById('main-content');
  const saveBtn = document.getElementById('save-sig-btn');
  const clearBtn = document.getElementById('clear-sig-btn');
  const reSignBtn = document.getElementById('re-sign-btn');
  const savedSigContainer = document.getElementById('saved-signature-container');

  let isDrawing = false;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  function getPos(e) {
    const rect = sigCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  sigCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  sigCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  sigCanvas.addEventListener('mouseup', () => isDrawing = false);
  sigCanvas.addEventListener('mouseleave', () => isDrawing = false);

  clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height));

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['userSignature'], (res) => {
      if (res.userSignature) { displaySignature(res.userSignature); unlockBoard(); }
    });
  } else {
    const saved = localStorage.getItem('userSignature');
    if (saved) { displaySignature(saved); unlockBoard(); }
  }

  saveBtn.addEventListener('click', () => {
    const dataURL = sigCanvas.toDataURL('image/png');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ userSignature: dataURL }, () => { displaySignature(dataURL); unlockBoard(); });
    } else {
      localStorage.setItem('userSignature', dataURL);
      displaySignature(dataURL);
      unlockBoard();
    }
  });

  reSignBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    mainContent.classList.add('blurred');
    modal.classList.remove('hidden');
  });

  function unlockBoard() {
    modal.classList.add('hidden');
    mainContent.classList.remove('blurred');
  }

  function displaySignature(dataURL) {
    savedSigContainer.innerHTML = `<img src="${dataURL}" alt="User Signature" />`;
  }

  // --- Interactive Canvas Board ---
  const boardCanvas = new fabric.Canvas('interactive-board', {
    width: window.innerWidth,
    height: window.innerHeight - 65,
    selection: true
  });

  function saveCanvasState() {
    const json = JSON.stringify(boardCanvas.toJSON());
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ y2kBoardData: json });
    } else {
      localStorage.setItem('y2kBoardData', json);
    }
  }

  function loadCanvasState() {
    const loader = (json) => {
      if (json) boardCanvas.loadFromJSON(json, () => boardCanvas.renderAll());
    };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['y2kBoardData'], (res) => loader(res.y2kBoardData));
    } else {
      loader(localStorage.getItem('y2kBoardData'));
    }
  }

  boardCanvas.on('object:modified', saveCanvasState);
  boardCanvas.on('object:added', saveCanvasState);

  // Note & Star Adders
  document.getElementById('add-note-btn').addEventListener('click', () => {
    const stickyText = new fabric.Textbox('✦ Type note here...', {
      left: 150, top: 320, width: 180, fontSize: 18, fontFamily: 'Fredoka', fill: '#000000',
      backgroundColor: '#fff385', padding: 12, borderColor: '#000000', cornerColor: '#ff91d7', cornerSize: 10, transparentCorners: false
    });
    boardCanvas.add(stickyText);
    boardCanvas.setActiveObject(stickyText);
    boardCanvas.renderAll();
  });

  document.getElementById('add-star-btn').addEventListener('click', () => {
    const starPath = 'M 12 0 L 15 8 L 24 12 L 15 16 L 12 24 L 9 16 L 0 12 L 9 8 Z';
    const star = new fabric.Path(starPath, {
      left: 250, top: 320, fill: '#ff91d7', stroke: '#000000', strokeWidth: 2, scaleX: 3, scaleY: 3,
      cornerColor: '#b2fba5', cornerSize: 10, transparentCorners: false
    });
    boardCanvas.add(star);
    boardCanvas.setActiveObject(star);
    boardCanvas.renderAll();
  });

  document.getElementById('image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(f) {
      fabric.Image.fromURL(f.target.result, (img) => {
        img.scaleToWidth(150);
        img.set({ left: 200, top: 300, cornerColor: '#ff91d7', cornerSize: 10, transparentCorners: false });
        boardCanvas.add(img);
        boardCanvas.setActiveObject(img);
        boardCanvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('delete-selected-btn').addEventListener('click', () => {
    const activeObjects = boardCanvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj) => boardCanvas.remove(obj));
      boardCanvas.discardActiveObject();
      boardCanvas.renderAll();
      saveCanvasState();
    }
  });

  // --- Sticker Vault Modal ---
  const stickerModal = document.getElementById('sticker-modal');
  document.getElementById('open-stickers-btn').addEventListener('click', () => stickerModal.classList.remove('hidden'));
  document.getElementById('close-sticker-btn').addEventListener('click', () => stickerModal.classList.add('hidden'));

  const svgStickers = {
    cd: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#e0e0e0" stroke="#000" stroke-width="4"/><circle cx="50" cy="50" r="15" fill="#fff" stroke="#000" stroke-width="3"/><path d="M 20 50 A 30 30 0 0 1 80 50" fill="none" stroke="#ff91d7" stroke-width="4"/></svg>`,
    heart: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="#ff91d7" stroke="#000" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    flower: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="25" r="15" fill="#fff385" stroke="#000" stroke-width="3"/><circle cx="50" cy="75" r="15" fill="#fff385" stroke="#000" stroke-width="3"/><circle cx="25" cy="50" r="15" fill="#fff385" stroke="#000" stroke-width="3"/><circle cx="75" cy="50" r="15" fill="#fff385" stroke="#000" stroke-width="3"/><circle cx="50" cy="50" r="15" fill="#ff91d7" stroke="#000" stroke-width="3"/></svg>`,
    sparkle: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M 50 0 L 62 38 L 100 50 L 62 62 L 50 100 L 38 62 L 0 50 L 38 38 Z" fill="#b2fba5" stroke="#000" stroke-width="3"/></svg>`,
    tamagotchi: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect x="15" y="10" width="70" height="80" rx="20" fill="#ff91d7" stroke="#000" stroke-width="4"/><rect x="30" y="25" width="40" height="30" fill="#b2fba5" stroke="#000" stroke-width="3"/><circle cx="35" cy="70" r="5" fill="#fff385" stroke="#000" stroke-width="2"/><circle cx="50" cy="73" r="5" fill="#fff385" stroke="#000" stroke-width="2"/><circle cx="65" cy="70" r="5" fill="#fff385" stroke="#000" stroke-width="2"/></svg>`,
    alien: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="35" ry="42" fill="#b2fba5" stroke="#000" stroke-width="4"/><ellipse cx="35" cy="45" rx="10" ry="16" fill="#000" transform="rotate(-15 35 45)"/><ellipse cx="65" cy="45" rx="10" ry="16" fill="#000" transform="rotate(15 65 45)"/></svg>`
  };

  document.querySelectorAll('.sticker-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sticker;
      const svgStr = svgStickers[type];
      fabric.loadSVGFromString(svgStr, (objects, options) => {
        const loadedSVG = fabric.util.groupSVGElements(objects, options);
        loadedSVG.set({ left: 200, top: 320, cornerColor: '#ff91d7', cornerSize: 10, transparentCorners: false });
        boardCanvas.add(loadedSVG);
        boardCanvas.setActiveObject(loadedSVG);
        boardCanvas.renderAll();
        stickerModal.classList.add('hidden');
      });
    });
  });

  // --- Full-Body Avatar Builder ---
  const avatarModal = document.getElementById('avatar-modal');
  document.getElementById('open-avatar-btn').addEventListener('click', () => avatarModal.classList.remove('hidden'));
  document.getElementById('close-avatar-btn').addEventListener('click', () => avatarModal.classList.add('hidden'));

  const layerHair = document.getElementById('layer-hair');
  const layerOutfit = document.getElementById('layer-outfit');
  const layerEars = document.getElementById('layer-ears');
  const layerTail = document.getElementById('layer-tail');
  const layerHand = document.getElementById('layer-hand');
  const layerShoes = document.getElementById('layer-shoes');

  const fullHair = {
    twin: `<path d="M 72 35 C 60 55 55 120 75 160 M 128 35 C 140 55 145 120 125 160" fill="none" stroke="#fff0a0" stroke-width="12" stroke-linecap="round"/><path d="M 75 35 Q 100 20 125 35 Q 100 50 75 35 Z" fill="#fff0a0" stroke="#000" stroke-width="2"/>`,
    buns: `<circle cx="68" cy="30" r="14" fill="#fff0a0" stroke="#000" stroke-width="2"/><circle cx="132" cy="30" r="14" fill="#fff0a0" stroke="#000" stroke-width="2"/>`,
    short: `<path d="M 72 35 Q 100 20 128 35 L 132 75 Q 100 85 68 75 Z" fill="#fff0a0" stroke="#000" stroke-width="2"/>`
  };

  const fullOutfits = {
    hoodie: `<path d="M 68 85 L 132 85 L 140 170 L 60 170 Z" fill="#607685" stroke="#000" stroke-width="2.5"/><path d="M 75 170 L 75 250 L 96 250 L 96 170 Z M 104 170 L 104 250 L 125 250 L 125 170 Z" fill="#758d9e" stroke="#000" stroke-width="2"/>`,
    skirt: `<path d="M 75 85 L 125 85 L 130 130 L 70 130 Z" fill="#ff91d7" stroke="#000" stroke-width="2"/><path d="M 70 130 L 130 130 L 140 175 L 60 175 Z" fill="#fff385" stroke="#000" stroke-width="2"/>`
  };

  const fullEars = {
    cat: `<polygon points="65,35 80,10 88,40" fill="#f5e1d3" stroke="#000" stroke-width="2"/><polygon points="135,35 120,10 112,40" fill="#f5e1d3" stroke="#000" stroke-width="2"/>`,
    bear: `<circle cx="72" cy="30" r="10" fill="#d09a74" stroke="#000" stroke-width="2"/><circle cx="128" cy="30" r="10" fill="#d09a74" stroke="#000" stroke-width="2"/>`,
    none: ''
  };

  const fullTail = {
    cat: `<path d="M 100 240 Q 170 240 150 170 Q 140 140 160 120" fill="none" stroke="#f5e1d3" stroke-width="22" stroke-linecap="round"/><path d="M 100 240 Q 170 240 150 170 Q 140 140 160 120" fill="none" stroke="#000" stroke-width="26" stroke-linecap="round" style="z-index:-1;"/>`,
    bear: '',
    none: ''
  };

  const fullHand = {
    bear: `<g transform="translate(115, 175)"><rect x="10" y="10" width="30" height="40" rx="10" fill="#a06844" stroke="#000" stroke-width="2"/><circle cx="25" cy="18" r="10" fill="#a06844" stroke="#000" stroke-width="2"/><circle cx="21" cy="17" r="1.5" fill="#000"/><circle cx="29" cy="17" r="1.5" fill="#000"/></g>`,
    none: ''
  };

  const defaultShoes = `<rect x="68" y="250" width="30" height="25" rx="6" fill="#324759" stroke="#000" stroke-width="2"/><rect x="102" y="250" width="30" height="25" rx="6" fill="#324759" stroke="#000" stroke-width="2"/>`;
  layerShoes.innerHTML = defaultShoes;

  // Set initial avatar defaults
  layerHair.innerHTML = fullHair.twin;
  layerOutfit.innerHTML = fullOutfits.hoodie;
  layerEars.innerHTML = fullEars.cat;
  layerTail.innerHTML = fullTail.cat;
  layerHand.innerHTML = fullHand.bear;

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const val = btn.dataset.val;

      if (type === 'hair') layerHair.innerHTML = fullHair[val] || '';
      if (type === 'outfit') layerOutfit.innerHTML = fullOutfits[val] || '';
      if (type === 'ears') {
        layerEars.innerHTML = fullEars[val] || '';
        layerTail.innerHTML = fullTail[val] || '';
      }
      if (type === 'hand') layerHand.innerHTML = fullHand[val] || '';
    });
  });

  document.getElementById('stamp-avatar-btn').addEventListener('click', () => {
    const svgElement = document.getElementById('avatar-svg');
    const svgString = new XMLSerializer().serializeToString(svgElement);
    
    fabric.loadSVGFromString(svgString, (objects, options) => {
      const avatarObj = fabric.util.groupSVGElements(objects, options);
      avatarObj.set({ left: 300, top: 220, scaleX: 0.9, scaleY: 0.9, cornerColor: '#ff91d7', cornerSize: 10, transparentCorners: false });
      boardCanvas.add(avatarObj);
      boardCanvas.setActiveObject(avatarObj);
      boardCanvas.renderAll();
      avatarModal.classList.add('hidden');
    });
  });

  window.addEventListener('resize', () => {
    boardCanvas.setWidth(window.innerWidth);
    boardCanvas.setHeight(window.innerHeight - 65);
    boardCanvas.renderAll();
  });

  loadCanvasState();
});