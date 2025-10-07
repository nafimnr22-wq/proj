import { supabase } from '../lib/supabase.js';
import { formatDate, showNotification } from '../lib/utils.js';

export async function renderWaterPumpDashboard(project) {
  const app = document.getElementById('app');

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('project_id', project.project_id);

  const { data: telemetryData, count: telemetryCount } = await supabase
    .from('wp_samples')
    .select('*', { count: 'exact' })
    .eq('project_id', project.project_id)
    .order('ts_utc', { ascending: false })
    .limit(20);

  const { data: mlModels } = await supabase
    .from('ml_models')
    .select('*')
    .eq('project_id', project.project_id)
    .order('created_at', { ascending: false });


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
      </div>

      <div class="page-header">
        <h1 class="page-title">${project.project_name}</h1>
        <p class="page-description">
          <span class="badge badge-info">Water Pump</span>
          Project ID: ${project.project_id} | ${telemetryCount || 0} total samples
        </p>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 class="card-title" style="margin: 0;">Connected Devices</h2>
          <button class="btn btn-primary" onclick="openAddDeviceModal('${project.project_id}', '${project.project_type}')">+ Add New Device</button>
        </div>
        ${devices && devices.length > 0 ? `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Role</th>
                  <th>Auto Update</th>
                  <th>Tank Shape</th>
                  <th>Dimensions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${devices.map(device => `
                  <tr>
                    <td style="font-family: monospace;">${device.device_id}</td>
                    <td><span class="badge ${device.role === 'beta' ? 'badge-warning' : 'badge-secondary'}">${device.role}</span></td>
                    <td>${device.auto_update ? '✓' : '✗'}</td>
                    <td>${device.tank_shape || 'N/A'}</td>
                    <td>${device.height_cm ? `H: ${device.height_cm}cm` : ''} ${device.width_cm ? `W: ${device.width_cm}cm` : ''}</td>
                    <td>
                      <button class="btn btn-small btn-secondary" onclick="window.router.navigate('/device/telemetry?id=${device.device_id}')">View</button>
                      <button class="btn btn-small btn-primary" onclick="window.router.navigate('/device/edit?id=${device.device_id}')">Edit</button>
                      <button class="btn btn-small btn-danger" onclick="deleteDevice('${device.device_id}')">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📱</div>
            <p>No devices connected to this project</p>
          </div>
        `}
      </div>

    </div>
  `;

  window.updateActiveNav('projects');
}

window.deleteDevice = async function(deviceId) {
  if (!confirm('Delete this device? This cannot be undone!')) return;

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('device_id', deviceId);

  if (error) {
    showNotification('Error deleting device: ' + error.message, 'error');
    return;
  }

  showNotification('Device deleted successfully', 'success');
  window.location.reload();
};

window.openAddDeviceModal = function(projectId, projectType) {
  const modalHtml = `
    <div id="deviceModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h2 style="margin-top: 0;">Add New Device</h2>
        <form id="addDeviceForm" onsubmit="submitAddDevice(event, '${projectId}', '${projectType}')">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Device ID *</label>
            <input type="text" name="device_id" class="form-input" required placeholder="e.g., WP01-D004" />
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Role</label>
            <select name="role" class="form-input">
              <option value="regular">Regular</option>
              <option value="beta">Beta</option>
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="auto_update" />
              <span>Enable Auto Update</span>
            </label>
          </div>

          ${projectType === 'water_pump' ? `
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Tank Shape</label>
              <select name="tank_shape" class="form-input">
                <option value="">Select shape</option>
                <option value="cylinder">Cylinder</option>
                <option value="rectangular">Rectangular</option>
              </select>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Height (cm)</label>
              <input type="number" name="height_cm" class="form-input" step="0.1" placeholder="e.g., 200" />
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Width (cm)</label>
              <input type="number" name="width_cm" class="form-input" step="0.1" placeholder="e.g., 100" />
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Length (cm)</label>
              <input type="number" name="length_cm" class="form-input" step="0.1" placeholder="For rectangular tanks" />
            </div>
          ` : ''}

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="closeDeviceModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Device</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeDeviceModal = function() {
  const modal = document.getElementById('deviceModal');
  if (modal) modal.remove();
};

window.submitAddDevice = async function(event, projectId, projectType) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const deviceData = {
    device_id: formData.get('device_id'),
    project_id: projectId,
    role: formData.get('role'),
    auto_update: formData.get('auto_update') === 'on',
  };

  if (projectType === 'water_pump') {
    if (formData.get('tank_shape')) deviceData.tank_shape = formData.get('tank_shape');
    if (formData.get('height_cm')) deviceData.height_cm = parseFloat(formData.get('height_cm'));
    if (formData.get('width_cm')) deviceData.width_cm = parseFloat(formData.get('width_cm'));
    if (formData.get('length_cm')) deviceData.length_cm = parseFloat(formData.get('length_cm'));
  }

  const { data, error } = await supabase
    .from('devices')
    .insert(deviceData)
    .select()
    .single();

  if (error) {
    showNotification('Error adding device: ' + error.message, 'error');
    return;
  }

  showNotification('Device added successfully', 'success');
  closeDeviceModal();
  window.location.reload();
};

