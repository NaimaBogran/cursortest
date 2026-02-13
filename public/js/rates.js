// Rates configuration page script

let roles = [];
let departments = [];
let rates = [];

document.addEventListener('DOMContentLoaded', async function() {
  const hasAccess = await Auth.requireRole(['Admin']);
  if (!hasAccess) return;
  
  await loadData();
  renderRoles();
  renderDepartments();
  setupSeedButton();
  setupRoleModal();
  setupDeptModal();
  setupOverrideModal();
  setupThreshold();
});

async function loadData() {
  try {
    roles = await ConvexApp.query('roles:list', {});
    departments = await ConvexApp.query('departments:list', {});
    rates = await ConvexApp.query('rates:list', {});
    
    const seedSection = document.getElementById('seed-section');
    if (seedSection) {
      seedSection.style.display = (roles.length === 0 && departments.length === 0) ? 'block' : 'none';
    }
    renderRoles();
    renderDepartments();
    renderDefaultRates();
    renderOverrides();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function slugFromName(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function renderRoles() {
  const container = document.getElementById('roles-list');
  if (!container) return;
  if (roles.length === 0) {
    container.innerHTML = '<p class="loading">No roles yet. Add one or seed preset data.</p>';
    return;
  }
  container.innerHTML = roles.map(r => `
    <div class="list-item">
      <span class="list-item-name">${r.name}</span>
      <span class="list-item-meta">${r.slug}</span>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editRole('${r._id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="removeRole('${r._id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function renderDepartments() {
  const container = document.getElementById('departments-list');
  if (!container) return;
  if (departments.length === 0) {
    container.innerHTML = '<p class="loading">No departments yet. Add one or seed preset data.</p>';
    return;
  }
  container.innerHTML = departments.map(d => `
    <div class="list-item">
      <span class="list-item-name">${d.name}</span>
      <span class="list-item-meta">${d.slug}</span>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editDept('${d._id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="removeDept('${d._id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

function setupSeedButton() {
  const btn = document.getElementById('seed-btn');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    btn.textContent = 'Seeding...';
    btn.disabled = true;
    try {
      const result = await ConvexApp.mutation('seed:run', {});
      alert(result.message || 'Done.');
      await loadData();
    } catch (e) {
      alert('Failed: ' + (e.message || e));
    } finally {
      btn.textContent = 'Seed Preset Data';
      btn.disabled = false;
    }
  });
}

function setupRoleModal() {
  const modal = document.getElementById('role-modal');
  const titleEl = document.getElementById('role-modal-title');
  const form = document.getElementById('role-form');
  const roleIdInput = document.getElementById('role-id');
  const nameInput = document.getElementById('role-name');
  const slugInput = document.getElementById('role-slug');
  const rateInput = document.getElementById('role-rate');
  const errorEl = document.getElementById('role-error');
  
  document.getElementById('add-role-btn').addEventListener('click', () => {
    roleIdInput.value = '';
    titleEl.textContent = 'Add Role';
    nameInput.value = '';
    slugInput.value = '';
    rateInput.value = '';
    errorEl.style.display = 'none';
    modal.style.display = 'flex';
  });
  document.getElementById('role-modal-close').addEventListener('click', () => modal.style.display = 'none');
  document.getElementById('cancel-role').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  
  nameInput.addEventListener('input', function() {
    if (!roleIdInput.value) slugInput.value = slugFromName(this.value);
  });
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = roleIdInput.value;
    const name = nameInput.value.trim();
    const slug = slugInput.value.trim();
    const rateDollars = parseFloat(rateInput.value);
    errorEl.style.display = 'none';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
      if (id) {
        await ConvexApp.mutation('roles:update', { id, name, slug });
      } else {
        const newRoleId = await ConvexApp.mutation('roles:create', { name, slug });
        if (!isNaN(rateDollars) && rateDollars > 0 && newRoleId) {
          const token = Auth.getToken();
          if (token) await ConvexApp.mutation('rates:setRate', { token, roleId: newRoleId, rateCents: Math.round(rateDollars * 100) });
        }
      }
      modal.style.display = 'none';
      await loadData();
    } catch (err) {
      errorEl.textContent = err.message || 'Failed';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Role';
    }
  });
}

async function editRole(id) {
  const role = roles.find(r => r._id === id);
  if (!role) return;
  document.getElementById('role-id').value = id;
  document.getElementById('role-modal-title').textContent = 'Edit Role';
  document.getElementById('role-name').value = role.name;
  document.getElementById('role-slug').value = role.slug;
  document.getElementById('role-rate').value = '';
  document.getElementById('role-error').style.display = 'none';
  document.getElementById('role-modal').style.display = 'flex';
}

async function removeRole(id) {
  if (!confirm('Remove this role? Rates and meeting data may be affected.')) return;
  try {
    await ConvexApp.mutation('roles:remove', { id });
    await loadData();
  } catch (e) {
    alert('Failed: ' + e.message);
  }
}

function setupDeptModal() {
  const modal = document.getElementById('dept-modal');
  const titleEl = document.getElementById('dept-modal-title');
  const form = document.getElementById('dept-form');
  const deptIdInput = document.getElementById('dept-id');
  const nameInput = document.getElementById('dept-name');
  const slugInput = document.getElementById('dept-slug');
  const errorEl = document.getElementById('dept-error');
  
  document.getElementById('add-dept-btn').addEventListener('click', () => {
    deptIdInput.value = '';
    titleEl.textContent = 'Add Department';
    nameInput.value = '';
    slugInput.value = '';
    errorEl.style.display = 'none';
    modal.style.display = 'flex';
  });
  document.getElementById('dept-modal-close').addEventListener('click', () => modal.style.display = 'none');
  document.getElementById('cancel-dept').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  
  nameInput.addEventListener('input', function() {
    if (!deptIdInput.value) slugInput.value = slugFromName(this.value);
  });
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = deptIdInput.value;
    const name = nameInput.value.trim();
    const slug = slugInput.value.trim();
    errorEl.style.display = 'none';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
      if (id) {
        await ConvexApp.mutation('departments:update', { id, name, slug });
      } else {
        await ConvexApp.mutation('departments:create', { name, slug });
      }
      modal.style.display = 'none';
      await loadData();
    } catch (err) {
      errorEl.textContent = err.message || 'Failed';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Department';
    }
  });
}

async function editDept(id) {
  const dept = departments.find(d => d._id === id);
  if (!dept) return;
  document.getElementById('dept-id').value = id;
  document.getElementById('dept-modal-title').textContent = 'Edit Department';
  document.getElementById('dept-name').value = dept.name;
  document.getElementById('dept-slug').value = dept.slug;
  document.getElementById('dept-error').style.display = 'none';
  document.getElementById('dept-modal').style.display = 'flex';
}

async function removeDept(id) {
  if (!confirm('Remove this department? Overrides and user assignments may be affected.')) return;
  try {
    await ConvexApp.mutation('departments:remove', { id });
    await loadData();
  } catch (e) {
    alert('Failed: ' + e.message);
  }
}

function renderDefaultRates() {
  const container = document.getElementById('default-rates');
  if (!container) return;
  const defaultRates = rates.filter(r => !r.departmentId);
  
  if (roles.length === 0) {
    container.innerHTML = '<p class="loading">Add roles above or seed preset data, then set hourly rates here.</p>';
    return;
  }
  
  container.innerHTML = roles.map(role => {
    const rate = defaultRates.find(r => r.roleId === role._id);
    const rateDollars = rate ? (rate.rateCents / 100).toFixed(2) : '0.00';
    
    return `
      <div class="rate-item">
        <label>${role.name}</label>
        <div class="rate-input-group">
          <span>$</span>
          <input type="number" 
            data-role-id="${role._id}" 
            value="${rateDollars}" 
            min="0" 
            step="0.01"
            onchange="saveDefaultRate('${role._id}', this.value)">
          <span>/hr</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderOverrides() {
  const container = document.getElementById('override-rates');
  
  // Get override rates (with departmentId)
  const overrideRates = rates.filter(r => r.departmentId);
  
  if (overrideRates.length === 0) {
    container.innerHTML = '<p class="loading">No department overrides set</p>';
    return;
  }
  
  container.innerHTML = overrideRates.map(rate => `
    <div class="override-item">
      <div class="override-info">
        <strong>${rate.roleName}</strong>
        <span>in ${rate.departmentName}:</span>
        <span>$${(rate.rateCents / 100).toFixed(2)}/hr</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="removeOverride('${rate._id}')">Remove</button>
    </div>
  `).join('');
}

async function saveDefaultRate(roleId, value) {
  const rateCents = Math.round(parseFloat(value) * 100);
  const token = Auth.getToken();
  if (!token) { alert('Please sign in again.'); return; }
  try {
    await ConvexApp.mutation('rates:setRate', {
      token,
      roleId,
      rateCents,
    });
    rates = await ConvexApp.query('rates:list', {});
  } catch (error) {
    alert('Failed to save rate: ' + (Helpers.cleanError ? Helpers.cleanError(error) : error.message));
  }
}

async function removeOverride(rateId) {
  if (!confirm('Remove this override?')) return;
  const token = Auth.getToken();
  if (!token) { alert('Please sign in again.'); return; }
  try {
    await ConvexApp.mutation('rates:removeOverride', { token, id: rateId });
    await loadData();
  } catch (error) {
    alert('Failed to remove override: ' + (Helpers.cleanError ? Helpers.cleanError(error) : error.message));
  }
}

function setupOverrideModal() {
  const modal = document.getElementById('override-modal');
  const addBtn = document.getElementById('add-override-btn');
  const closeBtn = document.getElementById('override-modal-close');
  const cancelBtn = document.getElementById('cancel-override');
  const form = document.getElementById('override-form');
  const roleSelect = document.getElementById('override-role');
  const deptSelect = document.getElementById('override-dept');
  
  // Populate selects
  roleSelect.innerHTML = '<option value="">Select a role</option>' +
    roles.map(r => `<option value="${r._id}">${r.name}</option>`).join('');
  
  deptSelect.innerHTML = '<option value="">Select a department</option>' +
    departments.map(d => `<option value="${d._id}">${d.name}</option>`).join('');
  
  addBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('override-error').style.display = 'none';
    modal.style.display = 'flex';
  });
  
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const roleId = roleSelect.value;
    const departmentId = deptSelect.value;
    const rateDollars = parseFloat(document.getElementById('override-rate').value);
    const rateCents = Math.round(rateDollars * 100);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    const token = Auth.getToken();
    if (!token) { alert('Please sign in again.'); return; }
    try {
      await ConvexApp.mutation('rates:setRate', {
        token,
        roleId,
        rateCents,
        departmentId,
      });
      modal.style.display = 'none';
      await loadData();
    } catch (error) {
      document.getElementById('override-error').textContent = Helpers.cleanError ? Helpers.cleanError(error) : error.message;
      document.getElementById('override-error').style.display = 'block';
    } finally {
      submitBtn.textContent = 'Save Override';
      submitBtn.disabled = false;
    }
  });
}

function setupThreshold() {
  const thresholdInput = document.getElementById('cost-threshold');
  const saveBtn = document.getElementById('save-threshold');
  
  // Load current threshold
  ConvexApp.query('stats:getSettings', {}).then(settings => {
    thresholdInput.value = settings.costThresholdDollars;
  });
  
  saveBtn.addEventListener('click', async function() {
    const valueCents = Math.round(parseFloat(thresholdInput.value) * 100);
    
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
      await ConvexApp.mutation('settings:set', {
        key: 'costThreshold',
        value: valueCents,
      });
      alert('Threshold saved!');
    } catch (error) {
      alert('Failed to save: ' + (Helpers.cleanError ? Helpers.cleanError(error) : error.message));
    } finally {
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  });
}
