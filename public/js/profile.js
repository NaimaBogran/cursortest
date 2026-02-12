// Profile page script

document.addEventListener('DOMContentLoaded', async function() {
  if (!Auth.requireAuth()) return;
  
  const form = document.getElementById('profile-form');
  const errorMessage = document.getElementById('error-message');
  const departmentSelect = document.getElementById('department');
  const userRoleSpan = document.getElementById('user-role');
  const nameInput = document.getElementById('name');
  
  // Load departments
  try {
    const departments = await ConvexApp.query('departments:list', {});
    departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept._id;
      option.textContent = dept.name;
      departmentSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading departments:', error);
  }
  
  // Load current user data
  try {
    const user = await Auth.getCurrentUser();
    if (user) {
      nameInput.value = user.name || '';
      userRoleSpan.textContent = user.role;
      if (user.departmentId) {
        departmentSelect.value = user.departmentId;
      }
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = nameInput.value;
    const departmentId = departmentSelect.value || undefined;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    errorMessage.style.display = 'none';
    
    try {
      await ConvexApp.mutation('users:createOrUpdateUser', {
        name,
        departmentId,
      });
      
      window.location.href = '/dashboard';
    } catch (error) {
      errorMessage.textContent = error.message || 'Failed to save profile.';
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
