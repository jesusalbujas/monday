// ======= Estado =======
const state = {
  servers: [], // {id, name, ip, note, status}
  services: [], // {id, name, desc, serverId, status}
  editMode: null, // {type: 'server'|'service', id: string}
};

const STORAGE_KEY = 'service-manager-v1';

// ======= Referencias DOM =======
const el = {
  boards: document.getElementById('boards'),
  stats: document.getElementById('stats'),
  openAdd: document.getElementById('openAdd'),
  addModal: document.getElementById('addModal'),
  modalTitle: document.querySelector('.modal-title'),
  tabs: [...document.querySelectorAll('.tab')],
  formService: document.getElementById('formService'),
  formServer: document.getElementById('formServer'),
  svcName: document.getElementById('svcName'),
  svcDesc: document.getElementById('svcDesc'),
  svcServer: document.getElementById('svcServer'),
  svcStatus: document.getElementById('svcStatus'),
  srvName: document.getElementById('srvName'),
  srvIP: document.getElementById('srvIP'),
  srvNote: document.getElementById('srvNote'),
  srvStatus: document.getElementById('srvStatus'),
  cancelAdd1: document.getElementById('cancelAdd1'),
  cancelAdd2: document.getElementById('cancelAdd2'),
  toast: document.getElementById('toast'),
};

// ======= Utilidades =======
const uid = () => Math.random().toString(36).slice(2, 9);

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.servers = (data.servers || []).map(s => ({
        ...s,
        status: s.status || 'active' // Migrar datos existentes
      }));
      state.services = (data.services || []).map(s => ({
        ...s,
        status: s.status || 'active' // Migrar datos existentes
      }));
    }
  } catch {
    // ignorar errores de parsing
  }
};

const toast = (msg) => {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  setTimeout(() => el.toast.classList.remove('show'), 1800);
};

const ipValid = (ip) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) && 
  ip.split('.').every(n => +n >= 0 && +n <= 255);

const escapeHtml = (str) => {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
};

// ======= Funciones de Render =======
function updateStats() {
  const activeServers = state.servers.filter(s => s.status === 'active').length;
  const activeServices = state.services.filter(s => s.status === 'active').length;
  el.stats.textContent = `${activeServers}/${state.servers.length} servidores · ${activeServices}/${state.services.length} servicios`;
}

function updateServerSelect() {
  el.svcServer.innerHTML = '';
  
  const activeServers = state.servers.filter(s => s.status === 'active');
  
  if (activeServers.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— No hay servidores activos —';
    el.svcServer.appendChild(opt);
    el.svcServer.disabled = true;
  } else {
    el.svcServer.disabled = false;
    activeServers.forEach(server => {
      const opt = document.createElement('option');
      opt.value = server.id;
      opt.textContent = `${server.name} (${server.ip})`;
      el.svcServer.appendChild(opt);
    });
    
    // También mostrar servidores inactivos pero deshabilitados si estamos editando
    const inactiveServers = state.servers.filter(s => s.status === 'inactive');
    if (inactiveServers.length > 0 && state.editMode) {
      inactiveServers.forEach(server => {
        const opt = document.createElement('option');
        opt.value = server.id;
        opt.textContent = `${server.name} (${server.ip}) - Inactivo`;
        opt.disabled = true;
        el.svcServer.appendChild(opt);
      });
    }
  }
}

function createStatusBadge(status) {
  return `<span class="status-badge ${status}">
    <span class="status-dot"></span>
    ${status === 'active' ? 'Activo' : 'Inactivo'}
  </span>`;
}

function createActionButtons(type, id) {
  return `
    <div class="${type === 'server' ? 'board-actions' : 'card-actions'}">
      <button class="action-btn edit" onclick="editItem('${type}', '${id}')" title="Editar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/>
        </svg>
      </button>
      <button class="action-btn delete" onclick="deleteItem('${type}', '${id}')" title="Eliminar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  `;
}

function createServiceCard(svc) {
  const card = document.createElement('article');
  card.className = `card ${svc.status === 'inactive' ? 'inactive' : ''}`;
  card.setAttribute('draggable', 'true');
  card.dataset.id = svc.id;
  
  card.innerHTML = `
    <div class="card-header">
      <h4>${escapeHtml(svc.name)}</h4>
      ${createActionButtons('service', svc.id)}
    </div>
    ${svc.desc ? `<p>${escapeHtml(svc.desc)}</p>` : ''}
    <div style="margin-top: 8px;">
      ${createStatusBadge(svc.status)}
    </div>
  `;
  
  card.addEventListener('dragstart', (e) => {
    if (svc.status === 'inactive') {
      e.preventDefault();
      toast('No se pueden mover servicios inactivos');
      return;
    }
    e.dataTransfer.setData('text/plain', svc.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  
  return card;
}

function addDragAndDrop(zone) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    
    const serviceId = e.dataTransfer.getData('text/plain');
    const service = state.services.find(s => s.id === serviceId);
    
    if (!service) return;
    
    const serverId = zone.dataset.server;
    const targetServer = state.servers.find(s => s.id === serverId);
    
    if (!targetServer || targetServer.status === 'inactive') {
      toast('No se puede mover a un servidor inactivo');
      return;
    }
    
    if (service.serverId !== serverId) {
      service.serverId = serverId;
      save();
      render();
      toast('Servicio movido');
    }
  });
}

function createServerBoard(server) {
  const services = state.services.filter(s => s.serverId === server.id);
  const board = document.createElement('section');
  board.className = `board ${server.status === 'inactive' ? 'inactive' : ''}`;
  
  board.innerHTML = `
    <div class="board-header">
      <div>
        <div class="board-title">${escapeHtml(server.name)}</div>
        <div class="board-meta">
          ${escapeHtml(server.ip)}${server.note ? ' · ' + escapeHtml(server.note) : ''}
          · ${createStatusBadge(server.status)}
        </div>
      </div>
      <div class="board-sub">${services.length} svc</div>
      ${createActionButtons('server', server.id)}
    </div>
    <div class="dropzone" data-server="${server.id}"></div>
  `;

  const zone = board.querySelector('.dropzone');
  
  if (services.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Sin servicios';
    zone.appendChild(empty);
  } else {
    services.forEach(svc => zone.appendChild(createServiceCard(svc)));
  }

  addDragAndDrop(zone);
  return board;
}

function renderBoards() {
  el.boards.innerHTML = '';
  
  if (state.servers.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'empty';
    hint.style.marginTop = '10px';
    hint.textContent = 'Aún no hay servidores. Haz clic en "Agregar" → "Servidor" para crear el primero.';
    el.boards.appendChild(hint);
  } else {
    // Mostrar primero servidores activos, luego inactivos
    const activeServers = state.servers.filter(s => s.status === 'active');
    const inactiveServers = state.servers.filter(s => s.status === 'inactive');
    
    [...activeServers, ...inactiveServers].forEach(server => {
      el.boards.appendChild(createServerBoard(server));
    });
  }
}

function render() {
  updateStats();
  updateServerSelect();
  renderBoards();
}

// ======= Modal y Tabs =======
function openModal(tab = 'service', editData = null) {
  state.editMode = editData;
  
  if (editData) {
    el.modalTitle.textContent = `Editar ${editData.type === 'server' ? 'Servidor' : 'Servicio'}`;
    fillEditForm(editData);
  } else {
    el.modalTitle.textContent = 'Agregar';
    clearForms();
  }
  
  setTab(tab);
  if (typeof el.addModal.showModal === 'function') {
    el.addModal.showModal();
  } else {
    el.addModal.setAttribute('open', '');
  }
}

function closeModal() {
  el.addModal.close();
  state.editMode = null;
  clearForms();
}

function clearForms() {
  el.formServer.reset();
  el.formService.reset();
}

function fillEditForm(editData) {
  if (editData.type === 'server') {
    const server = state.servers.find(s => s.id === editData.id);
    if (server) {
      el.srvName.value = server.name;
      el.srvIP.value = server.ip;
      el.srvNote.value = server.note || '';
      el.srvStatus.value = server.status;
    }
  } else if (editData.type === 'service') {
    const service = state.services.find(s => s.id === editData.id);
    if (service) {
      el.svcName.value = service.name;
      el.svcDesc.value = service.desc || '';
      el.svcServer.value = service.serverId;
      el.svcStatus.value = service.status;
    }
  }
}

function setTab(tab) {
  el.tabs.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.tab === tab));
  });
  
  el.formService.style.display = tab === 'service' ? 'grid' : 'none';
  el.formServer.style.display = tab === 'server' ? 'grid' : 'none';
}

// ======= Funciones CRUD =======
window.editItem = (type, id) => {
  openModal(type, { type, id });
};

window.deleteItem = (type, id) => {
  const itemName = type === 'server' 
    ? state.servers.find(s => s.id === id)?.name 
    : state.services.find(s => s.id === id)?.name;
  
  if (!confirm(`¿Estás seguro de que quieres eliminar ${type === 'server' ? 'el servidor' : 'el servicio'} "${itemName}"?`)) {
    return;
  }
  
  if (type === 'server') {
    // Eliminar servidor y todos sus servicios
    const servicesCount = state.services.filter(s => s.serverId === id).length;
    state.servers = state.servers.filter(s => s.id !== id);
    state.services = state.services.filter(s => s.serverId !== id);
    
    save();
    render();
    toast(`Servidor eliminado${servicesCount > 0 ? ` junto con ${servicesCount} servicio(s)` : ''}`);
  } else {
    // Eliminar servicio
    state.services = state.services.filter(s => s.id !== id);
    save();
    render();
    toast('Servicio eliminado');
  }
};

// ======= Manejadores de Eventos =======
function handleServerSubmit(e) {
  e.preventDefault();
  
  const name = el.srvName.value.trim();
  const ip = el.srvIP.value.trim();
  const note = el.srvNote.value.trim();
  const status = el.srvStatus.value;
  
  if (!name) return toast('Nombre de servidor requerido');
  if (!ipValid(ip)) return toast('IP inválida');
  
  if (state.editMode && state.editMode.type === 'server') {
    // Editar servidor existente
    const server = state.servers.find(s => s.id === state.editMode.id);
    if (server) {
      server.name = name;
      server.ip = ip;
      server.note = note;
      server.status = status;
      
      // Si se desactiva un servidor, desactivar todos sus servicios
      if (status === 'inactive') {
        state.services.forEach(service => {
          if (service.serverId === server.id) {
            service.status = 'inactive';
          }
        });
      }
      
      toast('Servidor actualizado');
    }
  } else {
    // Crear nuevo servidor
    state.servers.push({ id: uid(), name, ip, note, status });
    toast('Servidor creado');
  }
  
  save();
  render();
  closeModal();
  el.formServer.reset();
}

function handleServiceSubmit(e) {
  e.preventDefault();
  
  const name = el.svcName.value.trim();
  const desc = el.svcDesc.value.trim();
  const serverId = el.svcServer.value;
  const status = el.svcStatus.value;
  
  if (!name) return toast('Nombre de servicio requerido');
  if (!serverId) {
    setTab('server');
    return toast('Primero crea un servidor activo');
  }
  
  // Verificar que el servidor destino esté activo
  const targetServer = state.servers.find(s => s.id === serverId);
  if (!targetServer || targetServer.status === 'inactive') {
    return toast('No se puede asignar a un servidor inactivo');
  }
  
  if (state.editMode && state.editMode.type === 'service') {
    // Editar servicio existente
    const service = state.services.find(s => s.id === state.editMode.id);
    if (service) {
      service.name = name;
      service.desc = desc;
      service.serverId = serverId;
      service.status = status;
      toast('Servicio actualizado');
    }
  } else {
    // Crear nuevo servicio
    state.services.push({ id: uid(), name, desc, serverId, status });
    toast('Servicio registrado');
  }
  
  save();
  render();
  closeModal();
  el.formService.reset();
}

function setupEventListeners() {
  // Modal y tabs
  el.openAdd.addEventListener('click', () => {
    const hasActiveServers = state.servers.some(s => s.status === 'active');
    openModal(hasActiveServers ? 'service' : 'server');
  });
  
  el.cancelAdd1.addEventListener('click', closeModal);
  el.cancelAdd2.addEventListener('click', closeModal);
  
  // Cerrar modal al hacer clic en el backdrop
  el.addModal.addEventListener('click', (e) => {
    if (e.target === el.addModal) {
      closeModal();
    }
  });
  
  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.addModal.open) {
      closeModal();
    }
  });
  
  el.tabs.forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
  });
  
  // Formularios
  el.formServer.addEventListener('submit', handleServerSubmit);
  el.formService.addEventListener('submit', handleServiceSubmit);
}

// ======= Datos de ejemplo =======
function seedIfEmpty() {
  if (state.servers.length === 0) {
    const serverApp = { 
      id: uid(), 
      name: 'srv-app-01', 
      ip: '192.168.1.10', 
      note: 'Aplicaciones', 
      status: 'active' 
    };
    const serverDb = { 
      id: uid(), 
      name: 'srv-db-01', 
      ip: '192.168.1.20', 
      note: 'Base de datos', 
      status: 'active' 
    };
    const serverTest = { 
      id: uid(), 
      name: 'srv-test-01', 
      ip: '192.168.1.30', 
      note: 'Testing', 
      status: 'inactive' 
    };
    
    state.servers.push(serverApp, serverDb, serverTest);
    state.services.push(
      { 
        id: uid(), 
        name: 'API Pedidos', 
        desc: 'Node.js', 
        serverId: serverApp.id, 
        status: 'active' 
      },
      { 
        id: uid(), 
        name: 'Sitio Web', 
        desc: 'Nginx + React', 
        serverId: serverApp.id, 
        status: 'active' 
      },
      { 
        id: uid(), 
        name: 'PostgreSQL', 
        desc: 'v15', 
        serverId: serverDb.id, 
        status: 'active' 
      },
      { 
        id: uid(), 
        name: 'Redis Cache', 
        desc: 'v7.0', 
        serverId: serverDb.id, 
        status: 'inactive' 
      }
    );
    
    save();
  }
}

// ======= Inicialización =======
function init() {
  load();
  seedIfEmpty();
  setupEventListeners();
  render();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}