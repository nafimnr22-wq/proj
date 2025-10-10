import { supabase } from '../lib/supabase.js';
import { formatDate, showNotification } from '../lib/utils.js';

export async function renderRealtimeData(params) {
  const deviceId = params.get('id');

  if (!deviceId) {
    window.router.navigate('/devices');
    return;
  }

  const app = document.getElementById('app');

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('*, projects (project_name, project_type, realtime_fields)')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (deviceError || !device) {
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

  const { data: realtimeData } = await supabase
    .from('realtime_data')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();

  const realtimeFields = device.projects?.realtime_fields || [];
  const currentData = realtimeData?.data || {};

  const projectType = device.projects?.project_type;
  const tableName = projectType === 'water_pump' ? 'wp_samples' :
                    projectType === 'smart_light' ? 'sl_samples' : null;

  let latestTelemetry = null;
  if (tableName) {
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('device_id', deviceId)
      .order('ts_utc', { ascending: false })
      .limit(1)
      .maybeSingle();
    latestTelemetry = data;
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
      <div class="actions" style="margin-bottom: 1.5rem;">
        <button class="btn btn-secondary" onclick="window.router.navigate('/project?id=${device.project_id}')">← Back to Project</button>
      </div>

      <div class="page-header">
        <h1 class="page-title">Realtime Data</h1>
        <p class="page-description">
          Device: ${device.device_id} | Project: ${device.projects?.project_name}
          ${realtimeData ? `<br>Last Updated: ${formatDate(realtimeData.updated_at)}` : ''}
        </p>
      </div>

      <div class="grid grid-2" style="align-items: start;">
        <div class="card">
          <h2 class="card-title">Realtime Data</h2>
          ${realtimeFields.length > 0 ? `
            <form id="realtime-form">
              ${realtimeFields.map(field => {
                const value = currentData[field.name] !== undefined ? currentData[field.name] : (field.default || '');

                if (field.type === 'checkbox') {
                  return `
                    <div class="form-group">
                      <div class="checkbox-wrapper">
                        <input type="checkbox" id="rt_${field.name}" name="${field.name}" ${value ? 'checked' : ''}>
                        <label class="form-label" for="rt_${field.name}" style="margin: 0;">${field.label}</label>
                      </div>
                    </div>
                  `;
                } else if (field.type === 'number') {
                  return `
                    <div class="form-group">
                      <label class="form-label" for="rt_${field.name}">${field.label}</label>
                      <input type="number" id="rt_${field.name}" name="${field.name}" class="form-input" value="${value}" step="any">
                    </div>
                  `;
                } else {
                  return `
                    <div class="form-group">
                      <label class="form-label" for="rt_${field.name}">${field.label}</label>
                      <input type="text" id="rt_${field.name}" name="${field.name}" class="form-input" value="${value}">
                    </div>
                  `;
                }
              }).join('')}

              <div class="actions">
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </div>
            </form>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">📊</div>
              <p>No realtime data fields configured for this project</p>
              <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                Edit the project settings to add realtime data fields
              </p>
            </div>
          `}
        </div>

        <div class="card">
          <h2 class="card-title">Latest Telemetry</h2>
          ${latestTelemetry ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Timestamp</div>
                <div style="font-weight: 500;">${formatDate(latestTelemetry.ts_utc)}</div>
              </div>

              ${projectType === 'water_pump' ? `
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Water Level</div>
                  <div style="font-weight: 500;">${latestTelemetry.level_pct ? latestTelemetry.level_pct.toFixed(1) + '%' : 'N/A'}</div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Pump Status</div>
                  <div><span class="badge ${latestTelemetry.pump_on ? 'badge-success' : 'badge-secondary'}">${latestTelemetry.pump_on ? 'ON' : 'OFF'}</span></div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Flow Out</div>
                  <div style="font-weight: 500;">${latestTelemetry.flow_out_lpm ? latestTelemetry.flow_out_lpm.toFixed(2) + ' L/min' : 'N/A'}</div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Flow In</div>
                  <div style="font-weight: 500;">${latestTelemetry.flow_in_lpm ? latestTelemetry.flow_in_lpm.toFixed(2) + ' L/min' : 'N/A'}</div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Net Flow</div>
                  <div style="font-weight: 500;">${latestTelemetry.net_flow_lpm ? latestTelemetry.net_flow_lpm.toFixed(2) + ' L/min' : 'N/A'}</div>
                </div>
              ` : projectType === 'smart_light' ? `
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Brightness</div>
                  <div style="font-weight: 500;">${latestTelemetry.brightness || 0}%</div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Power</div>
                  <div style="font-weight: 500;">${latestTelemetry.power_w ? latestTelemetry.power_w.toFixed(2) + ' W' : 'N/A'}</div>
                </div>
                <div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Color Temperature</div>
                  <div style="font-weight: 500;">${latestTelemetry.color_temp || 0} K</div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">📊</div>
              <p>No telemetry data available yet</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  setupRealtimeForm(deviceId, device.project_id, realtimeFields, realtimeData?.id);

  window.updateActiveNav('devices');
}

function setupRealtimeForm(deviceId, projectId, realtimeFields, realtimeDataId) {
  const form = document.getElementById('realtime-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {};

    realtimeFields.forEach(field => {
      const value = formData.get(field.name);
      if (field.type === 'checkbox') {
        data[field.name] = value === 'on';
      } else if (field.type === 'number' && value) {
        data[field.name] = parseFloat(value);
      } else if (value) {
        data[field.name] = value;
      }
    });

    let error;
    if (realtimeDataId) {
      const result = await supabase
        .from('realtime_data')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', realtimeDataId);
      error = result.error;
    } else {
      const result = await supabase
        .from('realtime_data')
        .insert({
          device_id: deviceId,
          project_id: projectId,
          data,
        });
      error = result.error;
    }

    if (error) {
      showNotification('Error saving realtime data: ' + error.message, 'error');
      return;
    }

    showNotification('Realtime data saved successfully', 'success');
    setTimeout(() => window.location.reload(), 500);
  });
}
