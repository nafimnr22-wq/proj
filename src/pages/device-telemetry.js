import { supabase } from '../lib/supabase.js';
import { formatDate, showNotification } from '../lib/utils.js';

export async function renderDeviceTelemetry(params) {
  const deviceId = params.get('id');

  if (!deviceId) {
    window.router.navigate('/devices');
    return;
  }

  const app = document.getElementById('app');

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('*, projects (project_name, project_type, ml_enabled)')
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

  const projectType = device.projects?.project_type;

  if (projectType === 'water_pump') {
    await renderWaterPumpTelemetry(device);
  } else if (projectType === 'smart_light') {
    await renderSmartLightTelemetry(device);
  } else {
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
        <div class="empty-state">Unknown project type</div>
      </div>
    `;
  }
}

async function renderWaterPumpTelemetry(device) {
  const app = document.getElementById('app');

  const { data: samples, count: sampleCount } = await supabase
    .from('wp_samples')
    .select('*', { count: 'exact' })
    .eq('device_id', device.device_id)
    .order('ts_utc', { ascending: false })
    .limit(20);

  const mlEnabled = device.projects?.ml_enabled || false;

  let mlModels = [];
  if (mlEnabled) {
    const { data } = await supabase
      .from('ml_models')
      .select('*')
      .eq('device_id', device.device_id)
      .order('created_at', { ascending: false });
    mlModels = data || [];
  }

  const latestSample = samples && samples.length > 0 ? samples[0] : null;

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
      <div class="page-header">
        <h1 class="page-title">Device Telemetry</h1>
        <p class="page-description">
          <span class="badge badge-info">Water Pump</span>
          Device: ${device.device_id}
        </p>
      </div>

      ${latestSample ? `
        <div class="grid grid-3">
          <div class="stat-card">
            <div class="stat-value">${latestSample.level_pct?.toFixed(1) || 0}%</div>
            <div class="stat-label">Water Level</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${latestSample.pump_on ? 'ON' : 'OFF'}</div>
            <div class="stat-label">Pump Status</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${latestSample.net_flow_lpm?.toFixed(2) || 0}</div>
            <div class="stat-label">Net Flow (L/min)</div>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h2 class="card-title" style="margin: 0;">Telemetry Data</h2>
            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.875rem;">
              Total samples: ${sampleCount || 0}
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-danger" onclick="deleteAllTelemetry('${device.device_id}')" ${!sampleCount ? 'disabled' : ''}>
              Clear All Data
            </button>
          </div>
        </div>
        ${samples && samples.length > 0 ? `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level (%)</th>
                  <th>Pump</th>
                  <th>Flow Out (LPM)</th>
                  <th>Flow In (LPM)</th>
                  <th>Net Flow (LPM)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${samples.map(sample => `
                  <tr>
                    <td>${formatDate(sample.ts_utc)}</td>
                    <td>${sample.level_pct !== null ? sample.level_pct + '%' : 'N/A'}</td>
                    <td>${sample.pump_on ? '<span class="badge badge-success">ON</span>' : '<span class="badge badge-secondary">OFF</span>'}</td>
                    <td>${sample.flow_out_lpm !== null ? sample.flow_out_lpm : 'N/A'}</td>
                    <td>${sample.flow_in_lpm !== null ? sample.flow_in_lpm : 'N/A'}</td>
                    <td style="color: ${sample.net_flow_lpm > 0 ? 'var(--success)' : sample.net_flow_lpm < 0 ? 'var(--danger)' : 'inherit'};">
                      ${sample.net_flow_lpm !== null ? sample.net_flow_lpm : 'N/A'}
                    </td>
                    <td>
                      <button class="btn btn-small btn-danger" onclick="deleteTelemetrySample(${sample.id})">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${sampleCount > 20 ? `<p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">Showing 20 of ${sampleCount} samples</p>` : ''}
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>No telemetry data available yet</p>
          </div>
        `}
      </div>

      ${mlEnabled ? `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 class="card-title" style="margin: 0;">ML Models</h2>
            <button class="btn btn-primary" onclick="trainModel('${device.device_id}')" ${!sampleCount || sampleCount < 10 ? 'disabled' : ''}>
              Train & Generate TFLite Model
            </button>
          </div>
          ${mlModels && mlModels.length > 0 ? `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Training Samples</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${mlModels.map(model => `
                    <tr>
                      <td>${formatDate(model.created_at)}</td>
                      <td style="font-family: monospace; font-size: 0.875rem;">${model.filename}</td>
                      <td><span class="badge badge-info">${model.model_type}</span></td>
                      <td>${model.training_samples}</td>
                      <td>${model.size_bytes ? (model.size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}</td>
                      <td>
                        <button class="btn btn-small btn-primary" onclick="downloadModel(${model.id}, '${model.filename}')">Download</button>
                        <button class="btn btn-small btn-danger" onclick="deleteModel(${model.id})">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">🤖</div>
              <p>No trained models available</p>
              <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                ${sampleCount < 10 ? `Need at least 10 telemetry samples to train (currently ${sampleCount || 0})` : 'Click "Train & Generate TFLite Model" to create your first model'}
              </p>
            </div>
          `}
        </div>
      ` : ''}

      <div class="actions">
        <button class="btn btn-secondary" onclick="window.router.navigate('/project?id=${device.project_id}')">Back to Project</button>
      </div>
    </div>
  `;

  window.updateActiveNav('projects');
}

async function renderSmartLightTelemetry(device) {
  const app = document.getElementById('app');

  const { data: samples, count: sampleCount } = await supabase
    .from('sl_samples')
    .select('*', { count: 'exact' })
    .eq('device_id', device.device_id)
    .order('ts_utc', { ascending: false })
    .limit(20);

  const mlEnabled = device.projects?.ml_enabled || false;

  let mlModels = [];
  if (mlEnabled) {
    const { data } = await supabase
      .from('ml_models')
      .select('*')
      .eq('device_id', device.device_id)
      .order('created_at', { ascending: false });
    mlModels = data || [];
  }

  const latestSample = samples && samples.length > 0 ? samples[0] : null;

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
      <div class="page-header">
        <h1 class="page-title">Device Telemetry</h1>
        <p class="page-description">
          <span class="badge badge-info">Smart Light</span>
          Device: ${device.device_id}
        </p>
      </div>

      ${latestSample ? `
        <div class="grid grid-3">
          <div class="stat-card">
            <div class="stat-value">${latestSample.brightness || 0}%</div>
            <div class="stat-label">Brightness</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${latestSample.power_w?.toFixed(1) || 0}W</div>
            <div class="stat-label">Power Consumption</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${latestSample.color_temp || 0}K</div>
            <div class="stat-label">Color Temperature</div>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h2 class="card-title" style="margin: 0;">Telemetry Data</h2>
            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.875rem;">
              Total samples: ${sampleCount || 0}
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-danger" onclick="deleteAllTelemetry('${device.device_id}')" ${!sampleCount ? 'disabled' : ''}>
              Clear All Data
            </button>
          </div>
        </div>
        ${samples && samples.length > 0 ? `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Brightness (%)</th>
                  <th>Power (W)</th>
                  <th>Color Temp (K)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${samples.map(sample => `
                  <tr>
                    <td>${formatDate(sample.ts_utc)}</td>
                    <td>${sample.brightness || 0}%</td>
                    <td>${sample.power_w?.toFixed(2) || 0}W</td>
                    <td>${sample.color_temp || 0}K</td>
                    <td>
                      <button class="btn btn-small btn-danger" onclick="deleteTelemetrySample(${sample.id}, 'sl_samples')">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${sampleCount > 20 ? `<p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">Showing 20 of ${sampleCount} samples</p>` : ''}
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>No telemetry data available yet</p>
          </div>
        `}
      </div>

      ${mlEnabled ? `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 class="card-title" style="margin: 0;">ML Models</h2>
            <button class="btn btn-primary" onclick="trainModel('${device.device_id}')" ${!sampleCount || sampleCount < 10 ? 'disabled' : ''}>
              Train & Generate TFLite Model
            </button>
          </div>
          ${mlModels && mlModels.length > 0 ? `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Training Samples</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${mlModels.map(model => `
                    <tr>
                      <td>${formatDate(model.created_at)}</td>
                      <td style="font-family: monospace; font-size: 0.875rem;">${model.filename}</td>
                      <td><span class="badge badge-info">${model.model_type}</span></td>
                      <td>${model.training_samples}</td>
                      <td>${model.size_bytes ? (model.size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}</td>
                      <td>
                        <button class="btn btn-small btn-primary" onclick="downloadModel(${model.id}, '${model.filename}')">Download</button>
                        <button class="btn btn-small btn-danger" onclick="deleteModel(${model.id})">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">🤖</div>
              <p>No trained models available</p>
              <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                ${sampleCount < 10 ? `Need at least 10 telemetry samples to train (currently ${sampleCount || 0})` : 'Click "Train & Generate TFLite Model" to create your first model'}
              </p>
            </div>
          `}
        </div>
      ` : ''}

      <div class="actions">
        <button class="btn btn-secondary" onclick="window.router.navigate('/project?id=${device.project_id}')">Back to Project</button>
      </div>
    </div>
  `;

  window.updateActiveNav('projects');
}

window.deleteTelemetrySample = async function(sampleId, table = 'wp_samples') {
  if (!confirm('Delete this telemetry sample?')) return;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', sampleId);

  if (error) {
    showNotification('Error deleting sample: ' + error.message, 'error');
    return;
  }

  showNotification('Sample deleted successfully', 'success');
  window.location.reload();
};

window.deleteAllTelemetry = async function(deviceId) {
  if (!confirm('Delete ALL telemetry data for this device? This cannot be undone!')) return;

  const { error } = await supabase
    .from('wp_samples')
    .delete()
    .eq('device_id', deviceId);

  const { error: error2 } = await supabase
    .from('sl_samples')
    .delete()
    .eq('device_id', deviceId);

  if (error || error2) {
    showNotification('Error deleting telemetry data', 'error');
    return;
  }

  showNotification('All telemetry data deleted successfully', 'success');
  window.location.reload();
};

window.trainModel = async function(deviceId) {
  showNotification('Training model... This may take a minute', 'info');

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-model`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: deviceId })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    showNotification('Model trained successfully! ' + result.training_samples + ' samples used', 'success');
    window.location.reload();
  } catch (error) {
    showNotification('Error training model: ' + error.message, 'error');
  }
};

window.downloadModel = async function(modelId, filename) {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-model?id=${modelId}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download model');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showNotification('Model downloaded successfully', 'success');
  } catch (error) {
    showNotification('Error downloading model: ' + error.message, 'error');
  }
};

window.deleteModel = async function(modelId) {
  if (!confirm('Delete this model? This cannot be undone!')) return;

  const { error } = await supabase
    .from('ml_models')
    .delete()
    .eq('id', modelId);

  if (error) {
    showNotification('Error deleting model: ' + error.message, 'error');
    return;
  }

  showNotification('Model deleted successfully', 'success');
  window.location.reload();
};
