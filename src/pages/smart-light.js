import { supabase } from '../lib/supabase.js';
import { renderDeviceTable } from '../lib/device-manager.js';

export async function renderSmartLightDashboard(project) {
  const app = document.getElementById('app');

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('project_id', project.project_id);

  const { count: telemetryCount } = await supabase
    .from('sl_samples')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.project_id);

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link">Home</a></li>
          <li><a href="/firmware" class="nav-link">Firmware</a></li>
          <li><a href="/devices" class="nav-link">Devices</a></li>
          <li><a href="/projects" class="nav-link active">Projects</a></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="actions" style="margin-bottom: 1.5rem;">
        <button class="btn btn-secondary" onclick="window.router.navigate('/projects')">← Back to Projects</button>
        <button class="btn btn-primary" onclick="window.router.navigate('/project/telemetry?id=${project.project_id}')">View All Telemetry</button>
        ${project.ml_enabled ? `<button class="btn btn-success" onclick="window.router.navigate('/project/ml-script?id=${project.project_id}')">ML Script Editor</button>` : ''}
      </div>

      <div class="page-header">
        <h1 class="page-title">${project.project_name}</h1>
        <p class="page-description">
          <span class="badge badge-info">Smart Light</span>
          ${project.ml_enabled ? '<span class="badge badge-success" style="margin-left: 0.5rem;">ML Enabled</span>' : ''}
          <br>
          Project ID: ${project.project_id} | ${telemetryCount || 0} total samples
        </p>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 class="card-title" style="margin: 0;">Connected Devices</h2>
          <button class="btn btn-primary" onclick="openAddDeviceModal('${project.project_id}')">+ Add New Device</button>
        </div>
        ${renderDeviceTable(project, devices)}
      </div>

    </div>
  `;

  window.updateActiveNav('projects');
}
