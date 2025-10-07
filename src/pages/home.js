import { supabase } from '../lib/supabase.js';

export async function renderHome() {
  const app = document.getElementById('app');

  const { data: projects } = await supabase.from('projects').select('*');
  const { data: devices } = await supabase.from('devices').select('*');
  const { data: firmware } = await supabase.from('firmware').select('*').order('uploaded_at', { ascending: false }).limit(1);

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link active">Home</a></li>
          <li><a href="/firmware" class="nav-link">Firmware</a></li>
          <li><a href="/devices" class="nav-link">Devices</a></li>
          <li><a href="/projects" class="nav-link">Projects</a></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">IoT Dashboard</h1>
        <p class="page-description">ESP32-S3 Firmware & Device Management System</p>
      </div>

      <div class="grid grid-3">
        <div class="stat-card">
          <div class="stat-value">${projects?.length || 0}</div>
          <div class="stat-label">Active Projects</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${devices?.length || 0}</div>
          <div class="stat-label">Connected Devices</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${firmware?.length || 0}</div>
          <div class="stat-label">Firmware Versions</div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">Quick Actions</h2>
        <div class="actions">
          <button class="btn btn-primary" onclick="window.router.navigate('/firmware')">Upload Firmware</button>
          <button class="btn btn-primary" onclick="window.router.navigate('/devices')">Manage Devices</button>
          <button class="btn btn-primary" onclick="window.router.navigate('/projects')">View Projects</button>
        </div>
      </div>

      ${projects && projects.length > 0 ? `
        <div class="card">
          <h2 class="card-title">Recent Projects</h2>
          <div class="grid grid-2">
            ${projects.slice(0, 4).map(project => `
              <div class="project-card" onclick="window.router.navigate('/project?id=${project.project_id}')">
                <div class="project-type">
                  <span class="badge badge-info">${project.project_type.replace('_', ' ')}</span>
                </div>
                <div class="project-name">${project.project_name}</div>
                <div class="project-id">${project.project_id}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  updateActiveNav('home');
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (
      (page === 'home' && link.getAttribute('href') === '/') ||
      (page !== 'home' && link.getAttribute('href') === `/${page}`)
    ) {
      link.classList.add('active');
    }
  });
}

window.updateActiveNav = updateActiveNav;
