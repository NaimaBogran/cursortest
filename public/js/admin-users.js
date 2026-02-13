// Admin users page - Meeting Tax

let departments = [];

document.addEventListener('DOMContentLoaded', async function() {
  // Check admin access
  const user = await Auth.getCurrentUser();
  if (!user || user.role !== 'Admin') {
    window.location.href = '/dashboard';
    return;
  }
  
  await loadData();
  setupEditModal();
});

async function loadData() {
  try {
    departments = await ConvexApp.query('departments:list', {});
    await loadUsers();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  const token = Auth.getToken();
  
  try {
    const users = await ConvexApp.query('users:listUsers', { token });
    
    if (users.length > 0) {
      tbody.innerHTML = users.map(user => `
        <tr>
          <td>${user.name || '—'}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>${user.departmentName || '—'}</td>
          <td>
            <button class="btn btn-sm" onclick="editUser('${user._id}', '${user.name || ''}', '${user.role}', '${user.departmentId || ''}')">
              Edit
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No users</td></tr>';
    }
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Error loading users</td></tr>';
  }
}

function setupEditModal() {
  const modal = document.getElementById('edit-user-modal');
  const closeBtn = document.getElementById('edit-modal-close');
  const cancelBtn = document.getElementById('cancel-edit');
  const form = document.getElementById('edit-user-form');
  const deptSelect = document.getElementById('edit-user-dept');
  
  deptSelect.innerHTML = '<option value="">None</option>' +
    departments.map(d => `<option value="${d._id}">${d.name}</option>`).join('');
  
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const token = Auth.getToken();
    const userId = document.getElementById('edit-user-id').value;
    const role = document.getElementById('edit-user-role').value;
    const departmentId = document.getElementById('edit-user-dept').value || undefined;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
      // Update role
      await ConvexApp.mutation('users:updateUserRole', { token, userId, role });
      
      // Update department
      await ConvexApp.mutation('users:updateUserDepartment', { token, userId, departmentId });
      
      modal.style.display = 'none';
      await loadUsers();
    } catch (error) {
      document.getElementById('edit-error').textContent = Helpers.cleanError(error);
      document.getElementById('edit-error').style.display = 'block';
    } finally {
      submitBtn.textContent = 'Save';
      submitBtn.disabled = false;
    }
  });
}

function editUser(userId, name, role, departmentId) {
  document.getElementById('edit-user-id').value = userId;
  document.getElementById('edit-user-name').value = name;
  document.getElementById('edit-user-role').value = role;
  document.getElementById('edit-user-dept').value = departmentId;
  document.getElementById('edit-error').style.display = 'none';
  
  document.getElementById('edit-user-modal').style.display = 'flex';
}

window.editUser = editUser;
