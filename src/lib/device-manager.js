import { supabase } from './supabase.js';
import { showNotification } from './utils.js';

export function renderDeviceTable(project, devices) {
  if (!devices || devices.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📱</div>
        <p>No devices connected to this project</p>
      </div>
    `;
  }

  const customFields = project.custom_fields || [];

  return `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Role</th>
            <th>Auto Update</th>
            ${customFields.map(field => `<th>${field.label}</th>`).join('')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(device => {
            const customData = device.custom_data || {};
            return `
              <tr>
                <td style="font-family: monospace;">${device.device_id}</td>
                <td><span class="badge ${device.role === 'beta' ? 'badge-warning' : 'badge-secondary'}">${device.role}</span></td>
                <td>${device.auto_update ? '✓' : '✗'}</td>
                ${customFields.map(field => {
                  let value = customData[field.name];
                  if (value === undefined || value === null) {
                    return '<td>N/A</td>';
                  }
                  if (field.type === 'checkbox') {
                    return `<td>${value ? '✓' : '✗'}</td>`;
                  }
                  return `<td>${value}</td>`;
                }).join('')}
                <td>
                  <div class="actions">
                    <button class="btn btn-small btn-info" onclick="window.router.navigate('/device/realtime?id=${device.device_id}')">Realtime</button>
                    <button class="btn btn-small btn-secondary" onclick="window.router.navigate('/device/telemetry?id=${device.device_id}')">View</button>
                    <button class="btn btn-small btn-primary" onclick="openEditDeviceModal('${device.device_id}', '${project.project_id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteDevice('${device.device_id}', '${project.project_id}')">Delete</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderDeviceFormFields(customFields) {
  if (!customFields || customFields.length === 0) {
    return '';
  }

  return customFields.map(field => {
    const required = field.required ? 'required' : '';

    switch (field.type) {
      case 'text':
        return `
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label} ${field.required ? '*' : ''}</label>
            <input type="text" name="custom_${field.name}" class="form-input" ${required} placeholder="Enter ${field.label.toLowerCase()}" />
          </div>
        `;

      case 'number':
        return `
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label} ${field.required ? '*' : ''}</label>
            <input type="number" name="custom_${field.name}" class="form-input" ${required} step="any" placeholder="Enter ${field.label.toLowerCase()}" />
          </div>
        `;

      case 'checkbox':
        return `
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="custom_${field.name}" />
              <span>${field.label}</span>
            </label>
          </div>
        `;

      case 'select':
        return `
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">${field.label} ${field.required ? '*' : ''}</label>
            <select name="custom_${field.name}" class="form-input" ${required}>
              <option value="">Select ${field.label.toLowerCase()}</option>
              ${(field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
          </div>
        `;

      default:
        return '';
    }
  }).join('');
}

export function getCustomDataFromForm(formData, customFields) {
  const customData = {};

  customFields.forEach(field => {
    const fieldName = `custom_${field.name}`;
    const value = formData.get(fieldName);

    if (field.type === 'checkbox') {
      customData[field.name] = value === 'on';
    } else if (field.type === 'number' && value) {
      customData[field.name] = parseFloat(value);
    } else if (value) {
      customData[field.name] = value;
    }
  });

  return customData;
}

export function setCustomDataInForm(customData, customFields) {
  customFields.forEach(field => {
    const fieldName = `custom_${field.name}`;
    const input = document.querySelector(`[name="${fieldName}"]`);

    if (!input) return;

    const value = customData[field.name];
    if (value === undefined || value === null) return;

    if (field.type === 'checkbox') {
      input.checked = !!value;
    } else {
      input.value = value;
    }
  });
}

window.openAddDeviceModal = async function(projectId) {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!project) {
    showNotification('Project not found', 'error');
    return;
  }

  const customFields = project.custom_fields || [];

  const modalHtml = `
    <div id="deviceModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
        <h2>Add New Device</h2>
        <form id="addDeviceForm" onsubmit="submitAddDevice(event, '${projectId}')">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Device ID *</label>
            <input type="text" name="device_id" class="form-input" required placeholder="e.g., DEV-${projectId}-001" />
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

          ${renderDeviceFormFields(customFields)}

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

window.openEditDeviceModal = async function(deviceId, projectId) {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (!project || !device) {
    showNotification('Device or project not found', 'error');
    return;
  }

  const customFields = project.custom_fields || [];

  const modalHtml = `
    <div id="deviceModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
        <h2>Edit Device</h2>
        <form id="editDeviceForm" onsubmit="submitEditDevice(event, '${deviceId}', '${projectId}')">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Device ID *</label>
            <input type="text" name="device_id" class="form-input" value="${device.device_id}" disabled style="background: var(--bg-secondary); cursor: not-allowed;" />
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Role</label>
            <select name="role" class="form-input">
              <option value="regular" ${device.role === 'regular' ? 'selected' : ''}>Regular</option>
              <option value="beta" ${device.role === 'beta' ? 'selected' : ''}>Beta</option>
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" name="auto_update" ${device.auto_update ? 'checked' : ''} />
              <span>Enable Auto Update</span>
            </label>
          </div>

          ${renderDeviceFormFields(customFields)}

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="closeDeviceModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Device</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  setTimeout(() => {
    setCustomDataInForm(device.custom_data || {}, customFields);
  }, 50);
};

window.closeDeviceModal = function() {
  const modal = document.getElementById('deviceModal');
  if (modal) modal.remove();
};

window.submitAddDevice = async function(event, projectId) {
  event.preventDefault();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  const form = event.target;
  const formData = new FormData(form);

  const deviceData = {
    device_id: formData.get('device_id'),
    project_id: projectId,
    role: formData.get('role'),
    auto_update: formData.get('auto_update') === 'on',
    custom_data: getCustomDataFromForm(formData, project.custom_fields || [])
  };

  const { error } = await supabase
    .from('devices')
    .insert(deviceData);

  if (error) {
    showNotification('Error adding device: ' + error.message, 'error');
    return;
  }

  showNotification('Device added successfully', 'success');
  closeDeviceModal();
  window.location.reload();
};

window.submitEditDevice = async function(event, deviceId, projectId) {
  event.preventDefault();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  const form = event.target;
  const formData = new FormData(form);

  const deviceData = {
    role: formData.get('role'),
    auto_update: formData.get('auto_update') === 'on',
    custom_data: getCustomDataFromForm(formData, project.custom_fields || [])
  };

  const { error } = await supabase
    .from('devices')
    .update(deviceData)
    .eq('device_id', deviceId);

  if (error) {
    showNotification('Error updating device: ' + error.message, 'error');
    return;
  }

  showNotification('Device updated successfully', 'success');
  closeDeviceModal();
  window.location.reload();
};

window.deleteDevice = async function(deviceId, projectId) {
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
