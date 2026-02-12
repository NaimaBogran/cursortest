// Rates configuration page script

let roles = [];
let departments = [];
let rates = [];

document.addEventListener('DOMContentLoaded', async function() {
  // Check admin access
  const hasAccess = await Auth.requireRole(['Admin']);
  if (!hasAccess) return;
  
  await loadData();
  setupOverrideModal();
  setupThreshold();
});

async function loadData() {
  try {
    roles = await ConvexApp.query('roles:list', {});
    departments = await ConvexApp.query('departments:list', {});
    rates = await ConvexApp.query('rates:list', {});
    
    renderDefaultRates();
    renderOverrides();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function renderDefaultRates() {
  const container = document.getElementById('default-rates');
  
  // Get default rates (no departmentId)
  const defaultRates = rates.filter(r => !r.departmentId);
  
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
  
  try {
    await ConvexApp.mutation('rates:setRate', {
      roleId,
      rateCents,
    });
    // Reload to update
    rates = await ConvexApp.query('rates:list', {});
  } catch (error) {
    alert('Failed to save rate: ' + error.message);
  }
}

async function removeOverride(rateId) {
  if (!confirm('Remove this override?')) return;
  
  try {
    await ConvexApp.mutation('rates:removeOverride', { id: rateId });
    await loadData();
  } catch (error) {
    alert('Failed to remove override: ' + error.message);
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
    
    try {
      await ConvexApp.mutation('rates:setRate', {
        roleId,
        rateCents,
        departmentId,
      });
      
      modal.style.display = 'none';
      await loadData();
    } catch (error) {
      document.getElementById('override-error').textContent = error.message;
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
      alert('Failed to save: ' + error.message);
    } finally {
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  });
}
