// Dashboard - Meeting Tax
// Direct data display. No fluff.

let currentPeriod = 'week';

document.addEventListener('DOMContentLoaded', async function() {
  // Check auth first
  const user = await Auth.getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return;
  }
  
  // Period toggle
  const periodButtons = document.querySelectorAll('.period-toggle .btn');
  periodButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      periodButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentPeriod = this.dataset.period;
      loadDashboard();
    });
  });
  
  await loadDashboard();
});

async function loadDashboard() {
  const token = Auth.getToken();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.js:loadDashboard',message:'Dashboard query start',data:{hasToken:!!token,period:currentPeriod},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  try {
    const stats = await ConvexApp.query('stats:getCosts', { 
      token,
      period: currentPeriod 
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard.js:loadDashboard:result',message:'Dashboard query result',data:{hasStats:!!stats,meetingCount:stats?.meetingCount,topMeetings:stats?.topMeetings?.map(m=>m.name)},hypothesisId:'H2,H3',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    
    if (!stats) {
      showEmptyState();
      return;
    }
    
    // Main cost - the number that matters
    document.getElementById('total-cost').textContent = formatMoney(stats.totalCents);
    document.getElementById('cost-period').textContent = 
      currentPeriod === 'week' ? 'this week' : 'this month';
    document.getElementById('meeting-count').textContent = 
      `across ${stats.meetingCount} meeting${stats.meetingCount !== 1 ? 's' : ''}`;
    
    // Department breakdown
    const deptEl = document.getElementById('dept-costs');
    if (stats.costByDepartment.length > 0) {
      deptEl.innerHTML = stats.costByDepartment
        .sort((a, b) => b.costCents - a.costCents)
        .map(dept => `
          <div class="stats-item">
            <span class="stats-item-name">${dept.name}</span>
            <span class="stats-item-value">${formatMoney(dept.costCents)}</span>
          </div>
        `).join('');
    } else {
      deptEl.innerHTML = '<p class="empty-state">No department data</p>';
    }
    
    // Role breakdown
    const roleEl = document.getElementById('role-costs');
    if (stats.costByRole.length > 0) {
      roleEl.innerHTML = stats.costByRole
        .sort((a, b) => b.costCents - a.costCents)
        .map(role => `
          <div class="stats-item">
            <span class="stats-item-name">${role.name}</span>
            <span class="stats-item-value">${formatMoney(role.costCents)}</span>
          </div>
        `).join('');
    } else {
      roleEl.innerHTML = '<p class="empty-state">No role data</p>';
    }
    
    // Most expensive meetings - simple rows
    const meetingsEl = document.getElementById('top-meetings');
    if (stats.topMeetings.length > 0) {
      meetingsEl.innerHTML = stats.topMeetings.map(meeting => `
        <div class="meeting-row" onclick="window.location.href='/meeting?id=${meeting.id}'">
          <div>
            <div class="meeting-name">${meeting.name}</div>
            <div class="meeting-meta">${formatDuration(meeting.durationMinutes)}</div>
          </div>
          <div class="meeting-cost-value${meeting.costCents > 100000 ? ' high' : ''}">${formatMoney(meeting.costCents)}</div>
        </div>
      `).join('');
    } else {
      meetingsEl.innerHTML = '<p class="empty-state">No meetings in this period</p>';
    }
    
    // Provocative insight - make people think
    updateInsight(stats);
    
  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

function showEmptyState() {
  document.getElementById('total-cost').textContent = '$0';
  document.getElementById('meeting-count').textContent = 'No meetings tracked';
  document.getElementById('dept-costs').innerHTML = '<p class="empty-state">—</p>';
  document.getElementById('role-costs').innerHTML = '<p class="empty-state">—</p>';
  document.getElementById('top-meetings').innerHTML = '<p class="empty-state">Create your first meeting to start tracking costs.</p>';
}

function updateInsight(stats) {
  const insightEl = document.getElementById('insight');
  if (!insightEl || stats.meetingCount === 0) {
    if (insightEl) insightEl.style.display = 'none';
    return;
  }
  
  insightEl.style.display = 'block';
  
  // Calculate annualized cost
  const multiplier = currentPeriod === 'week' ? 52 : 12;
  const annualized = stats.totalCents * multiplier;
  
  // Pick an insight based on data
  const avgCost = Math.round(stats.totalCents / stats.meetingCount);
  
  if (avgCost > 50000) { // >$500 avg
    insightEl.innerHTML = `Average meeting: <strong>${formatMoney(avgCost)}</strong>. That's ${Math.round(avgCost / 2500)} hours of engineer time per meeting.`;
  } else if (stats.topMeetings.length > 0 && stats.topMeetings[0].costCents > 100000) {
    const top = stats.topMeetings[0];
    insightEl.innerHTML = `"${top.name}" costs <strong>${formatMoney(top.costCents)}</strong> per occurrence. Worth it?`;
  } else {
    insightEl.innerHTML = `At this rate: <strong>${formatMoney(annualized)}</strong> per year on meetings.`;
  }
}

// Formatting helpers - inline for clarity
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
