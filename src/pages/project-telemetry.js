import { supabase } from '../lib/supabase.js';
import { formatDate, showNotification } from '../lib/utils.js';

export async function renderProjectTelemetry(projectId) {
  const app = document.getElementById('app');

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!project) {
    app.innerHTML = '<div class="container"><p>Project not found</p></div>';
    return;
  }

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('project_id', projectId);

  const isWaterPump = project.project_type === 'water_pump';
  const isSmartLight = project.project_type === 'smart_light';
  const tableName = isWaterPump ? 'wp_samples' : isSmartLight ? 'sl_samples' : null;

  let telemetryData = [];
  let totalCount = 0;

  if (tableName) {
    const { data, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('ts_utc', { ascending: false })
      .limit(100);

    telemetryData = data || [];
    totalCount = count || 0;
  }

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
        <button class="btn btn-secondary" onclick="window.router.navigate('/project?id=${projectId}')">← Back to Project</button>
        ${tableName ? `
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary" onclick="downloadTelemetry()">Download All</button>
            <button class="btn btn-success" onclick="document.getElementById('uploadFile').click()">Upload Telemetry</button>
            ${project.ml_enabled ? `<button class="btn btn-warning" onclick="trainModel()">Train Model</button>` : ''}
          </div>
          <input type="file" id="uploadFile" accept=".json,.csv" style="display: none;" onchange="uploadTelemetry(event)" />
        ` : ''}
      </div>

      <div class="page-header">
        <h1 class="page-title">${project.project_name} - Telemetry</h1>
        <p class="page-description">
          <span class="badge badge-info">${totalCount || 0} total samples</span>
          ${totalCount > 0 ? 'Showing most recent 100 samples' : ''}
        </p>
      </div>

      <div class="card">
        ${devices && devices.length > 0 ? `
          <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
            <label style="font-weight: 500;">Filter by Device:</label>
            <select id="deviceFilter" onchange="filterTelemetry()" class="form-input" style="max-width: 300px;">
              <option value="">All Devices</option>
              ${devices.map(d => `<option value="${d.device_id}">${d.device_id}</option>`).join('')}
            </select>
          </div>
        ` : ''}

        ${telemetryData && telemetryData.length > 0 ? `
          <div class="table-wrapper">
            <table id="telemetryTable">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device ID</th>
                  ${isWaterPump ? `
                    <th>Level %</th>
                    <th>Pump Status</th>
                    <th>Flow Out (L/min)</th>
                    <th>Flow In (L/min)</th>
                    <th>Net Flow (L/min)</th>
                  ` : isSmartLight ? `
                    <th>Brightness (%)</th>
                    <th>Power (W)</th>
                    <th>Color Temp (K)</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${telemetryData.map(sample => `
                  <tr data-device="${sample.device_id}">
                    <td style="font-family: monospace; font-size: 0.85rem;">${formatDate(sample.ts_utc)}</td>
                    <td style="font-family: monospace;">${sample.device_id}</td>
                    ${isWaterPump ? `
                      <td>${sample.level_pct ? Number(sample.level_pct).toFixed(1) + '%' : 'N/A'}</td>
                      <td><span class="badge ${sample.pump_on ? 'badge-success' : 'badge-secondary'}">${sample.pump_on ? 'ON' : 'OFF'}</span></td>
                      <td>${sample.flow_out_lpm ? Number(sample.flow_out_lpm).toFixed(2) : 'N/A'}</td>
                      <td>${sample.flow_in_lpm ? Number(sample.flow_in_lpm).toFixed(2) : 'N/A'}</td>
                      <td>${sample.net_flow_lpm ? Number(sample.net_flow_lpm).toFixed(2) : 'N/A'}</td>
                    ` : isSmartLight ? `
                      <td>${sample.brightness || 0}%</td>
                      <td>${sample.power_w ? Number(sample.power_w).toFixed(2) : 'N/A'}W</td>
                      <td>${sample.color_temp || 0}K</td>
                    ` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>No telemetry data available</p>
          </div>
        `}
      </div>
    </div>
  `;

  window.currentProjectType = project.project_type;
  window.currentProjectId = projectId;
  window.updateActiveNav('projects');
}

window.filterTelemetry = function() {
  const filterValue = document.getElementById('deviceFilter')?.value;
  if (!filterValue) return;

  const rows = document.querySelectorAll('#telemetryTable tbody tr');

  rows.forEach(row => {
    if (!filterValue || row.dataset.device === filterValue) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

window.downloadTelemetry = async function() {
  const projectId = window.currentProjectId;
  const projectType = window.currentProjectType;

  const tableName = projectType === 'water_pump' ? 'wp_samples' :
                    projectType === 'smart_light' ? 'sl_samples' : null;

  if (!tableName) {
    showNotification('Telemetry download not supported for this project type', 'error');
    return;
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('project_id', projectId)
    .order('ts_utc', { ascending: false });

  if (error) {
    showNotification('Error downloading telemetry: ' + error.message, 'error');
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `telemetry_${projectId}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showNotification('Telemetry data downloaded', 'success');
};

window.uploadTelemetry = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const projectId = window.currentProjectId;
  const projectType = window.currentProjectType;

  const tableName = projectType === 'water_pump' ? 'wp_samples' :
                    projectType === 'smart_light' ? 'sl_samples' : null;

  if (!tableName) {
    showNotification('Telemetry upload not supported for this project type', 'error');
    return;
  }

  try {
    const text = await file.text();
    let data;

    if (file.name.endsWith('.json')) {
      data = JSON.parse(text);
    } else if (file.name.endsWith('.csv')) {
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = values[i]?.trim();
        });
        return obj;
      });
    } else {
      showNotification('Unsupported file format. Use JSON or CSV.', 'error');
      return;
    }

    if (!Array.isArray(data)) {
      data = [data];
    }

    data.forEach(item => {
      if (!item.project_id) item.project_id = projectId;

      if (projectType === 'water_pump') {
        if (item.level_pct) item.level_pct = Number(item.level_pct);
        if (item.flow_out_lpm) item.flow_out_lpm = Number(item.flow_out_lpm);
        if (item.flow_in_lpm) item.flow_in_lpm = Number(item.flow_in_lpm);
        if (item.net_flow_lpm) item.net_flow_lpm = Number(item.net_flow_lpm);
        if (item.pump_on !== undefined) item.pump_on = item.pump_on === 'true' || item.pump_on === true;
      } else if (projectType === 'smart_light') {
        if (item.brightness) item.brightness = Number(item.brightness);
        if (item.power_w) item.power_w = Number(item.power_w);
        if (item.color_temp) item.color_temp = Number(item.color_temp);
      }
    });

    const { error } = await supabase
      .from(tableName)
      .insert(data);

    if (error) {
      showNotification('Error uploading telemetry: ' + error.message, 'error');
      return;
    }

    showNotification(`Uploaded ${data.length} samples successfully`, 'success');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    showNotification('Error parsing file: ' + err.message, 'error');
  }

  event.target.value = '';
};

window.trainModel = async function() {
  const projectId = window.currentProjectId;

  if (!confirm('Train a new ML model using all telemetry data? This may take a few moments.')) {
    return;
  }

  showNotification('Starting model training...', 'info');

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-model`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId })
    });

    if (!response.ok) {
      throw new Error(`Training failed: ${response.statusText}`);
    }

    const result = await response.json();
    showNotification(`Model trained successfully! Samples: ${result.samples_count}`, 'success');
  } catch (error) {
    showNotification('Error training model: ' + error.message, 'error');
  }
};
