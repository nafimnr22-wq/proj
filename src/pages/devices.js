import { supabase } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';

export async function renderDeviceList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link">Home</a></li>
          <li><a href="/firmware" class="nav-link">Firmware</a></li>
          <li><a href="/devices" class="nav-link active">Devices</a></li>
          <li><a href="/projects" class="nav-link">Projects</a></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Device Management</h1>
        <p class="page-description">View and manage all connected devices</p>
      </div>

      <div class="card">
        <h2 class="card-title">All Devices</h2>
        <div id="device-list">
          <div class="loading">Loading devices...</div>
        </div>
      </div>
    </div>
  `;

  loadDeviceList();

  window.updateActiveNav('devices');
}

async function loadDeviceList() {
  const listContainer = document.getElementById('device-list');

  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      projects (project_name, project_type)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    listContainer.innerHTML = `<div class="empty-state">Error loading devices: ${error.message}</div>`;
    return;
  }

  if (!devices || devices.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📱</div>
        <p>No devices registered yet</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Project</th>
            <th>Role</th>
            <th>Auto Update</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(device => `
            <tr>
              <td style="font-family: monospace;">${device.device_id}</td>
              <td>${device.projects?.project_name || 'N/A'}</td>
              <td><span class="badge ${device.role === 'beta' ? 'badge-warning' : 'badge-secondary'}">${device.role}</span></td>
              <td>${device.auto_update ? '✓' : '✗'}</td>
              <td>${formatDate(device.updated_at)}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-small btn-info" onclick="window.router.navigate('/device/realtime?id=${device.device_id}')">Realtime</button>
                  <button class="btn btn-small btn-primary" onclick="window.router.navigate('/device/telemetry?id=${device.device_id}')">View</button>
                  <button class="btn btn-small btn-secondary" onclick="window.router.navigate('/project?id=${device.project_id}')">Go to Project</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
