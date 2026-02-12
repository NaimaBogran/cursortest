// Calendar page script

let currentDate = new Date();
let meetings = [];

document.addEventListener('DOMContentLoaded', async function() {
  if (!Auth.requireAuth()) return;
  
  setupNavigation();
  await loadMonth();
});

function setupNavigation() {
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadMonth();
  });
  
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadMonth();
  });
}

async function loadMonth() {
  // Update header
  document.getElementById('current-month').textContent = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  
  // Get month boundaries
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // #region agent log
  const token = Auth.getToken();
  fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar.js:loadMonth',message:'Calendar query params',data:{hasToken:!!token,from:firstDay.getTime(),to:lastDay.getTime()},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  // Load meetings for this month
  try {
    meetings = await ConvexApp.query('meetings:list', {
      token: token,
      from: firstDay.getTime(),
      to: lastDay.getTime(),
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar.js:loadMonth:result',message:'Calendar query result',data:{meetingsCount:meetings.length,meetingNames:meetings.map(m=>m.name)},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (error) {
    console.error('Error loading meetings:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/de728452-ef5e-4f94-9896-1fc728f05ee3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'calendar.js:loadMonth:error',message:'Calendar query error',data:{error:error.message},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    meetings = [];
  }
  
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const today = new Date();
  
  // Add padding for days before first of month
  const startPadding = firstDay.getDay();
  for (let i = 0; i < startPadding; i++) {
    const prevMonth = new Date(firstDay);
    prevMonth.setDate(prevMonth.getDate() - (startPadding - i));
    grid.appendChild(createDayCell(prevMonth, true));
  }
  
  // Add days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isToday = date.toDateString() === today.toDateString();
    grid.appendChild(createDayCell(date, false, isToday));
  }
  
  // Add padding for days after last of month
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    const nextMonth = new Date(lastDay);
    nextMonth.setDate(nextMonth.getDate() + i);
    grid.appendChild(createDayCell(nextMonth, true));
  }
}

function createDayCell(date, isOtherMonth, isToday = false) {
  const cell = document.createElement('div');
  cell.className = 'calendar-day';
  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('today');
  
  // Find meetings for this day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayMeetings = meetings.filter(m => 
    m.startTime >= dayStart.getTime() && m.startTime <= dayEnd.getTime()
  );
  
  let meetingsPreview = '';
  if (dayMeetings.length > 0) {
    meetingsPreview = '<div class="day-meetings-preview">';
    dayMeetings.slice(0, 3).forEach(m => {
      meetingsPreview += `<div class="day-meeting-item">${m.name}</div>`;
    });
    if (dayMeetings.length > 3) {
      meetingsPreview += `<div class="day-meeting-item">+${dayMeetings.length - 3} more</div>`;
    }
    meetingsPreview += '</div>';
  }
  
  cell.innerHTML = `
    <div class="day-number">${date.getDate()}</div>
    ${meetingsPreview}
  `;
  
  cell.addEventListener('click', () => showDayDetail(date, dayMeetings));
  
  return cell;
}

function showDayDetail(date, dayMeetings) {
  const detail = document.getElementById('day-detail');
  
  document.getElementById('detail-date').textContent = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  const meetingsContainer = document.getElementById('day-meetings');
  
  if (dayMeetings.length > 0) {
    let totalCost = 0;
    meetingsContainer.innerHTML = dayMeetings.map(m => {
      totalCost += m.costCents;
      const descriptionHtml = m.description 
        ? `<div class="meeting-description" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${m.description}</div>` 
        : '';
      return `
        <div class="meeting-card" onclick="window.location.href='/meeting?id=${m._id}'" style="margin-bottom: 0.5rem;">
          <div class="meeting-info">
            <h3 style="font-size: 0.875rem;">${m.name}</h3>
            ${descriptionHtml}
            <div class="meeting-meta" style="font-size: 0.75rem;">
              ${Helpers.formatDuration(m.durationMinutes)}
            </div>
          </div>
          <div class="meeting-cost" style="font-size: 1rem;">
            ${Helpers.formatCurrency(m.costCents)}
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('day-total-cost').textContent = Helpers.formatCurrency(totalCost);
  } else {
    meetingsContainer.innerHTML = '<p class="empty-state">No meetings this day</p>';
    document.getElementById('day-total-cost').textContent = '$0';
  }
  
  detail.style.display = 'block';
}
