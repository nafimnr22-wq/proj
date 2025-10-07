import { supabase } from '../lib/supabase.js';
import { formatDate, formatBytes, showNotification } from '../lib/utils.js';

export async function renderFirmware() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link">Home</a></li>
          <li><a href="/firmware" class="nav-link active">Firmware</a></li>
          <li><a href="/devices" class="nav-link">Devices</a></li>
          <li><a href="/projects" class="nav-link">Projects</a></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Firmware Management</h1>
        <p class="page-description">Upload and manage ESP32-S3 firmware versions</p>
      </div>

      <div class="card">
        <h2 class="card-title">Upload New Firmware</h2>
        <form id="firmware-form">
          <div class="form-group">
            <label class="form-label" for="version">Version</label>
            <input type="text" id="version" class="form-input" placeholder="e.g., b0.1.1.0 or v1.0.0" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="file">Firmware File (.bin)</label>
            <input type="file" id="file" class="form-input" accept=".bin" required>
          </div>
          <button type="submit" class="btn btn-primary">Upload Firmware</button>
        </form>
      </div>

      <div class="card">
        <h2 class="card-title">Firmware History</h2>
        <div id="firmware-list">
          <div class="loading">Loading firmware history...</div>
        </div>
      </div>
    </div>
  `;

  loadFirmwareList();
  setupFirmwareForm();

  window.updateActiveNav('firmware');
}

async function loadFirmwareList() {
  const listContainer = document.getElementById('firmware-list');

  const { data: firmware, error } = await supabase
    .from('firmware')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    listContainer.innerHTML = `<div class="empty-state">Error loading firmware: ${error.message}</div>`;
    return;
  }

  if (!firmware || firmware.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No firmware uploaded yet</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Filename</th>
            <th>Size</th>
            <th>SHA256</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          ${firmware.map(fw => `
            <tr>
              <td><span class="badge badge-info">${fw.version}</span></td>
              <td>${fw.filename}</td>
              <td>${formatBytes(fw.size_bytes)}</td>
              <td style="font-family: monospace; font-size: 0.75rem;">${fw.sha256 ? fw.sha256.substring(0, 16) + '...' : 'N/A'}</td>
              <td>${formatDate(fw.uploaded_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setupFirmwareForm() {
  const form = document.getElementById('firmware-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const version = document.getElementById('version').value;
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];

    if (!file) {
      showNotification('Please select a file', 'error');
      return;
    }

    const sha256 = await calculateSHA256(file);

    const { error } = await supabase.from('firmware').insert([
      {
        version,
        filename: file.name,
        sha256,
        size_bytes: file.size,
        file_path: `/firmware/${file.name}`
      }
    ]);

    if (error) {
      showNotification('Error uploading firmware: ' + error.message, 'error');
      return;
    }

    showNotification('Firmware uploaded successfully', 'success');
    form.reset();
    loadFirmwareList();
  });
}

async function calculateSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
