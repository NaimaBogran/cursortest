// Meeting detail page script

let meetingId = null;
let meetingData = null;

document.addEventListener('DOMContentLoaded', async function() {
  if (!Auth.requireAuth()) return;
  
  // Get meeting ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  meetingId = urlParams.get('id');
  
  if (!meetingId) {
    window.location.href = '/meetings';
    return;
  }
  
  await loadMeeting();
  setupDeleteModal();
});

async function loadMeeting() {
  const contentEl = document.getElementById('meeting-content');
  
  try {
    meetingData = await ConvexApp.query('meetings:get', { id: meetingId });
    
    if (!meetingData) {
      contentEl.innerHTML = '<p class="loading">Meeting not found</p>';
      return;
    }
    
    // Calculate recurring cost if applicable
    let recurringInfo = '';
    if (meetingData.recurring) {
      const frequencyMultiplier = {
        daily: 20, // ~20 working days/month
        weekly: 4,
        biweekly: 2,
        monthly: 1,
      };
      const multiplier = frequencyMultiplier[meetingData.recurring.frequency] || 1;
      const monthlyCost = meetingData.costCents * multiplier;
      recurringInfo = `
        <div class="recurring-multiplier">
          Recurring ${meetingData.recurring.frequency} = ~${Helpers.formatCurrency(monthlyCost)}/month
        </div>
      `;
    }
    
    // Cost comparison
    let costComparison = '';
    if (meetingData.costCents > 249900) { // $2,499
      costComparison = '<div class="cost-comparison">More than a MacBook Pro!</div>';
    } else if (meetingData.costCents > 99900) { // $999
      costComparison = '<div class="cost-comparison">More than an iPhone!</div>';
    }
    
    contentEl.innerHTML = `
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <h1>${meetingData.name}</h1>
            <p class="meeting-meta">
              ${Helpers.formatDate(meetingData.startTime)} · ${Helpers.formatDuration(meetingData.durationMinutes)}
            </p>
            <p class="meeting-meta">Created by ${meetingData.creatorName}</p>
          </div>
          <div class="detail-cost ${meetingData.isOverThreshold ? 'over-threshold' : ''}">
            <div class="detail-cost-amount">${Helpers.formatCurrency(meetingData.costCents)}</div>
            ${costComparison}
            ${meetingData.isOverThreshold ? `<div class="threshold-warning">Over $${meetingData.thresholdDollars} threshold</div>` : ''}
            ${recurringInfo}
          </div>
        </div>
        
        <div class="detail-section">
          <h3>Attendees</h3>
          <div class="attendees-breakdown">
            ${meetingData.attendeesWithNames.map(att => `
              <div class="attendee-item">
                <span>${att.count}x ${att.roleName} (${att.departmentName})</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="detail-actions">
          <button class="btn btn-secondary" onclick="window.location.href='/meetings'">Back to Meetings</button>
          <button class="btn btn-danger" id="delete-meeting-btn">Cancel Meeting</button>
        </div>
      </div>
    `;
    
    // Setup delete button
    document.getElementById('delete-meeting-btn').addEventListener('click', showDeleteModal);
    
  } catch (error) {
    console.error('Error loading meeting:', error);
    contentEl.innerHTML = '<p class="loading">Error loading meeting</p>';
  }
}

function setupDeleteModal() {
  const modal = document.getElementById('delete-modal');
  const cancelBtn = document.getElementById('cancel-delete');
  const confirmBtn = document.getElementById('confirm-delete');
  
  cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  
  confirmBtn.addEventListener('click', async function() {
    confirmBtn.textContent = 'Cancelling...';
    confirmBtn.disabled = true;
    
    try {
      const result = await ConvexApp.mutation('meetings:remove', { id: meetingId });
      alert(`Meeting cancelled! You saved ${Helpers.formatCurrency(result.savingsCents)}`);
      window.location.href = '/meetings';
    } catch (error) {
      alert('Failed to cancel meeting: ' + (Helpers.cleanError ? Helpers.cleanError(error) : error.message));
    } finally {
      confirmBtn.textContent = 'Cancel Meeting';
      confirmBtn.disabled = false;
      modal.style.display = 'none';
    }
  });
  
  // Close on outside click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });
}

function showDeleteModal() {
  document.getElementById('savings-amount').textContent = Helpers.formatCurrency(meetingData.costCents);
  document.getElementById('delete-modal').style.display = 'flex';
}
