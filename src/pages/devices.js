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

window.toggleManualSwitch = async function(deviceId, currentState) {
  const newState = currentState === 1 ? 0 : 1;
  const button = document.getElementById(`switch-${deviceId}`);

  button.disabled = true;

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/esp32-switch?device_id=${deviceId}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manual_switch: newState })
    });

    if (!response.ok) {
      throw new Error('Failed to toggle switch');
    }

    button.textContent = newState === 1 ? 'ON' : 'OFF';
    button.className = `btn btn-small ${newState === 1 ? 'btn-success' : 'btn-secondary'}`;
    button.onclick = () => toggleManualSwitch(deviceId, newState);
  } catch (error) {
    alert('Error toggling switch: ' + error.message);
  } finally {
    button.disabled = false;
  }
};

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
            <th>Manual Switch</th>
            <th>Tank Info</th>
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
              <td>
                <button
                  class="btn btn-small ${device.manual_switch === 1 ? 'btn-success' : 'btn-secondary'}"
                  onclick="toggleManualSwitch('${device.device_id}', ${device.manual_switch})"
                  id="switch-${device.device_id}"
                >
                  ${device.manual_switch === 1 ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>${device.tank_shape ? `${device.tank_shape} (${device.height_cm}cm)` : 'N/A'}</td>
              <td>${formatDate(device.updated_at)}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-small btn-primary" onclick="window.router.navigate('/device/telemetry?id=${device.device_id}')">View</button>
                  <button class="btn btn-small btn-secondary" onclick="window.router.navigate('/device/edit?id=${device.device_id}')">Edit</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function renderDeviceEdit(params) {
  const deviceId = params.get('id');

  if (!deviceId) {
    window.router.navigate('/devices');
    return;
  }

  const app = document.getElementById('app');

  const { data: device, error } = await supabase
    .from('devices')
    .select('*, projects (project_name)')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error || !device) {
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
        <div class="empty-state">Device not found</div>
      </div>
    `;
    return;
  }

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
        <h1 class="page-title">Edit Device</h1>
        <p class="page-description">Device ID: ${device.device_id}</p>
      </div>

      <div class="card">
        <form id="device-form">
          <div class="form-group">
            <label class="form-label">Device ID</label>
            <input type="text" class="form-input" value="${device.device_id}" disabled>
          </div>

          <div class="form-group">
            <label class="form-label">Project</label>
            <input type="text" class="form-input" value="${device.projects?.project_name || 'N/A'}" disabled>
          </div>

          <div class="form-group">
            <label class="form-label" for="role">Role</label>
            <select id="role" class="form-select">
              <option value="regular" ${device.role === 'regular' ? 'selected' : ''}>Regular</option>
              <option value="beta" ${device.role === 'beta' ? 'selected' : ''}>Beta</option>
            </select>
          </div>

          <div class="form-group">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="auto_update" ${device.auto_update ? 'checked' : ''}>
              <label class="form-label" for="auto_update" style="margin: 0;">Enable Auto Update</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="tank_shape">Tank Shape</label>
            <select id="tank_shape" class="form-select">
              <option value="">None</option>
              <option value="cylinder" ${device.tank_shape === 'cylinder' ? 'selected' : ''}>Cylinder</option>
              <option value="rectangular" ${device.tank_shape === 'rectangular' ? 'selected' : ''}>Rectangular</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="height_cm">Height (cm)</label>
            <input type="number" id="height_cm" class="form-input" value="${device.height_cm || ''}" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label" for="width_cm">Width/Diameter (cm)</label>
            <input type="number" id="width_cm" class="form-input" value="${device.width_cm || ''}" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label" for="length_cm">Length (cm)</label>
            <input type="number" id="length_cm" class="form-input" value="${device.length_cm || ''}" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label" for="max_flow_in">Max Flow In (L/min)</label>
            <input type="number" id="max_flow_in" class="form-input" value="${device.max_flow_in || 0}" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label" for="max_flow_out">Max Flow Out (L/min)</label>
            <input type="number" id="max_flow_out" class="form-input" value="${device.max_flow_out || 0}" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label" for="pump_lower_threshold">Pump Lower Threshold (%)</label>
            <input type="number" id="pump_lower_threshold" class="form-input" value="${device.pump_lower_threshold || 15}" step="0.1" min="0" max="100">
          </div>

          <div class="form-group">
            <label class="form-label" for="pump_upper_threshold">Pump Upper Threshold (%)</label>
            <input type="number" id="pump_upper_threshold" class="form-input" value="${device.pump_upper_threshold || 100}" step="0.1" min="0" max="100">
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/devices')">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupDeviceForm(deviceId);

  window.updateActiveNav('devices');
}

function setupDeviceForm(deviceId) {
  const form = document.getElementById('device-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.getElementById('role').value;
    const autoUpdate = document.getElementById('auto_update').checked;
    const tankShape = document.getElementById('tank_shape').value || null;
    const heightCm = parseFloat(document.getElementById('height_cm').value) || null;
    const widthCm = parseFloat(document.getElementById('width_cm').value) || null;
    const lengthCm = parseFloat(document.getElementById('length_cm').value) || null;
    const maxFlowIn = parseFloat(document.getElementById('max_flow_in').value) || 0;
    const maxFlowOut = parseFloat(document.getElementById('max_flow_out').value) || 0;
    const pumpLowerThreshold = parseFloat(document.getElementById('pump_lower_threshold').value) || 15;
    const pumpUpperThreshold = parseFloat(document.getElementById('pump_upper_threshold').value) || 100;

    const { error } = await supabase
      .from('devices')
      .update({
        role,
        auto_update: autoUpdate,
        tank_shape: tankShape,
        height_cm: heightCm,
        width_cm: widthCm,
        length_cm: lengthCm,
        max_flow_in: maxFlowIn,
        max_flow_out: maxFlowOut,
        pump_lower_threshold: pumpLowerThreshold,
        pump_upper_threshold: pumpUpperThreshold,
        updated_at: new Date().toISOString()
      })
      .eq('device_id', deviceId);

    if (error) {
      alert('Error updating device: ' + error.message);
      return;
    }

    window.router.navigate('/devices');
  });
}
