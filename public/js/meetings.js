// Meetings page - Meeting Tax

let roles = [];
let departments = [];
let currentMeetingId = null;

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
  // Check auth
  currentUser = await Auth.getCurrentUser();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }
  
  await loadFormData();
  await loadMeetings();
  setupModal();
});

async function loadFormData() {
  try {
    roles = await ConvexApp.query('roles:list', {});
    departments = await ConvexApp.query('departments:list', {});
  } catch (error) {
    console.error('Error loading form data:', error);
  }
}

async function loadMeetings() {
  const meetingsList = document.getElementById('meetings-list');
  const token = Auth.getToken();
  
  try {
    const meetings = await ConvexApp.query('meetings:list', { token });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'meetings.js:loadMeetings',message:'Meetings list result',data:{count:meetings.length,meetings:meetings.map(m=>({name:m.name,startTime:m.startTime,startDate:new Date(m.startTime).toISOString()}))},hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const settings = await ConvexApp.query('stats:getSettings', {});
    const threshold = settings.costThresholdCents;
    
    // Filter to only show future/upcoming meetings
      const now = Date.now();
      const upcomingMeetings = meetings.filter(m => m.startTime > now);
      
      if (upcomingMeetings.length > 0) {
        const isAdmin = currentUser && currentUser.role === 'Admin';
        meetingsList.innerHTML = upcomingMeetings.map(meeting => {
          const isOverThreshold = meeting.costCents > threshold;
          const isCreator = currentUser && meeting.createdBy === currentUser._id;
          const canCancel = isAdmin || isCreator;
          
          return `
            <div class="meeting-card">
              <div class="meeting-info" onclick="window.location.href='/meeting?id=${meeting._id}'" style="cursor: pointer; flex: 1;">
                <h3>${meeting.name}</h3>
                <div class="meeting-meta">
                  ${formatDate(meeting.startTime)} · ${formatDuration(meeting.durationMinutes)}
                  ${meeting.recurring ? ` · ${meeting.recurring.frequency}` : ''}
                </div>
              </div>
              <div class="meeting-actions">
                <div class="meeting-cost ${isOverThreshold ? 'over-threshold' : ''}">
                  <div class="meeting-cost-amount">${formatMoney(meeting.costCents)}</div>
                  ${isOverThreshold ? '<div class="threshold-warning">Over threshold</div>' : ''}
                </div>
                ${canCancel ? `<button class="btn btn-cancel" onclick="cancelMeeting('${meeting._id}', '${meeting.name.replace(/'/g, "\\'")}', event)" title="Cancel meeting">Cancel</button>` : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        meetingsList.innerHTML = '<p class="empty-state">No upcoming meetings scheduled</p>';
      }
    } else {
      meetingsList.innerHTML = '<p class="empty-state">No upcoming meetings scheduled</p>';
    }
  } catch (error) {
    console.error('Error loading meetings:', error);
    meetingsList.innerHTML = '<p class="loading">Error loading meetings</p>';
  }
}

function setupModal() {
  const modal = document.getElementById('meeting-modal');
  const newMeetingBtn = document.getElementById('new-meeting-btn');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('cancel-meeting');
  const form = document.getElementById('meeting-form');
  const addAttendeeBtn = document.getElementById('add-attendee');
  
  newMeetingBtn.addEventListener('click', function() {
    currentMeetingId = null;
    document.getElementById('modal-title').textContent = 'New meeting';
    document.getElementById('meeting-id').value = '';
    form.reset();
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('meeting-date').value = now.toISOString().slice(0, 16);
    
    document.getElementById('attendees-list').innerHTML = '';
    addAttendeeRow();
    
    document.getElementById('cost-preview').style.display = 'none';
    modal.style.display = 'flex';
  });
  
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });
  
  addAttendeeBtn.addEventListener('click', addAttendeeRow);
  form.addEventListener('submit', handleSubmit);
}

function addAttendeeRow() {
  const attendeesList = document.getElementById('attendees-list');
  const row = document.createElement('div');
  row.className = 'attendee-row';
  
  row.innerHTML = `
    <select class="attendee-role" required>
      <option value="">Role</option>
      ${roles.map(r => `<option value="${r._id}">${r.name}</option>`).join('')}
    </select>
    <select class="attendee-dept" required>
      <option value="">Dept</option>
      ${departments.map(d => `<option value="${d._id}">${d.name}</option>`).join('')}
    </select>
    <input type="number" class="attendee-count" min="1" value="1" required>
    <button type="button" class="remove-attendee">&times;</button>
  `;
  
  row.querySelector('.remove-attendee').addEventListener('click', function() {
    row.remove();
    updateCostPreview();
  });
  
  row.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', updateCostPreview);
  });
  
  attendeesList.appendChild(row);
}

async function updateCostPreview() {
  const duration = parseInt(document.getElementById('meeting-duration').value) || 0;
  const attendeeRows = document.querySelectorAll('.attendee-row');
  
  let totalCents = 0;
  
  for (const row of attendeeRows) {
    const roleId = row.querySelector('.attendee-role').value;
    const deptId = row.querySelector('.attendee-dept').value;
    const count = parseInt(row.querySelector('.attendee-count').value) || 0;
    
    if (roleId && deptId && count > 0) {
      try {
        const rate = await ConvexApp.query('rates:getRate', { roleId, departmentId: deptId });
        if (rate) {
          totalCents += (rate.rateCents * (duration / 60) * count);
        }
      } catch (error) {
        // Ignore
      }
    }
  }
  
  const preview = document.getElementById('cost-preview');
  if (totalCents > 0) {
    document.getElementById('preview-amount').textContent = formatMoney(Math.round(totalCents));
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const token = Auth.getToken();
  const name = document.getElementById('meeting-name').value;
  const description = document.getElementById('meeting-description').value || undefined;
  const duration = parseInt(document.getElementById('meeting-duration').value);
  const dateValue = document.getElementById('meeting-date').value;
  const startTime = new Date(dateValue).getTime();
  const recurringValue = document.getElementById('meeting-recurring').value;
  
  // Collect attendees
  const attendees = [];
  document.querySelectorAll('.attendee-row').forEach(row => {
    const roleId = row.querySelector('.attendee-role').value;
    const departmentId = row.querySelector('.attendee-dept').value;
    const count = parseInt(row.querySelector('.attendee-count').value);
    
    if (roleId && departmentId && count > 0) {
      attendees.push({ roleId, departmentId, count });
    }
  });
  
  if (attendees.length === 0) {
    document.getElementById('form-error').textContent = 'Add at least one attendee';
    document.getElementById('form-error').style.display = 'block';
    return;
  }
  
  const submitBtn = document.querySelector('#meeting-form button[type="submit"]');
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    const args = {
      token,
      name,
      description,
      durationMinutes: duration,
      startTime,
      attendees,
    };
    
    if (recurringValue) {
      args.recurring = { frequency: recurringValue };
    }
    
    const result = await ConvexApp.mutation('meetings:create', args);
    
    document.getElementById('meeting-modal').style.display = 'none';
    await loadMeetings();
    
  } catch (error) {
    document.getElementById('form-error').textContent = error.message || 'Failed to save';
    document.getElementById('form-error').style.display = 'block';
  } finally {
    submitBtn.textContent = 'Save';
    submitBtn.disabled = false;
  }
}

// Duration change triggers cost update
document.getElementById('meeting-duration')?.addEventListener('change', updateCostPreview);

// Cancel/delete meeting (only future meetings)
async function cancelMeeting(meetingId, meetingName, event) {
  event.stopPropagation(); // Prevent card click navigation
  
  if (!confirm(`Cancel "${meetingName}"? This cannot be undone.`)) {
    return;
  }
  
  const token = Auth.getToken();
  
  try {
    // Pass cancelOnly flag to indicate we only want to cancel future meetings
    const result = await ConvexApp.mutation('meetings:remove', { token, id: meetingId, cancelOnly: true });
    
    // Show savings message
    if (result && result.savingsCents > 0) {
      const savedAmount = formatMoney(result.savingsCents);
      showNotification(`Meeting cancelled. You saved ${savedAmount}!`, 'success');
    }
    
    // Reload the list
    await loadMeetings();
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    showNotification('Failed to cancel meeting: ' + error.message, 'error');
  }
}

// Simple notification helper
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Formatting helpers
function formatMoney(cents) {
  return '$' + (cents / 100).toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
