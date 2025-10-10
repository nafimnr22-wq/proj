import { supabase } from '../lib/supabase.js';
import { formatDate, showNotification } from '../lib/utils.js';

export async function renderProjectList() {
  const app = document.getElementById('app');

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
        <h1 class="page-title">Projects</h1>
        <p class="page-description">Manage your IoT projects</p>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 class="card-title" style="margin: 0;">All Projects</h2>
          <button class="btn btn-primary" onclick="showCreateProjectModal()">Create New Project</button>
        </div>
        <div id="project-list">
          <div class="loading">Loading projects...</div>
        </div>
      </div>

      <div id="create-project-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 800px;">
          <h2>Create New Project</h2>
          <form id="create-project-form">
            <div class="form-group">
              <label class="form-label" for="project_id">Project ID</label>
              <input type="text" id="project_id" class="form-input" placeholder="e.g., WP03" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="project_name">Project Name</label>
              <input type="text" id="project_name" class="form-input" placeholder="e.g., Water Tank System" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="project_type">Project Type</label>
              <input type="text" id="project_type" class="form-input" placeholder="e.g., water_pump, smart_light" required>
              <small style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; display: block;">
                Use lowercase with underscores (e.g., water_pump, smart_light, temperature_sensor)
              </small>
            </div>
            <div class="form-group">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="ml_enabled">
                <label class="form-label" for="ml_enabled" style="margin: 0;">Enable ML Script</label>
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin: 0;">Custom Fields (for Devices)</label>
                <button type="button" class="btn btn-secondary" onclick="addCustomField()">Add Field</button>
              </div>
              <div id="custom-fields-container" style="display: flex; flex-direction: column; gap: 1rem;">
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin: 0;">Realtime Data Fields</label>
                <button type="button" class="btn btn-secondary" onclick="addRealtimeField()">Add Field</button>
              </div>
              <small style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem; display: block;">
                Realtime data can be edited from ESP32 devices and the dashboard
              </small>
              <div id="realtime-fields-container" style="display: flex; flex-direction: column; gap: 1rem;">
              </div>
            </div>

            <div class="actions">
              <button type="submit" class="btn btn-primary">Create Project</button>
              <button type="button" class="btn btn-secondary" onclick="hideCreateProjectModal()">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <div id="edit-project-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 800px;">
          <h2>Edit Project</h2>
          <form id="edit-project-form">
            <input type="hidden" id="edit_project_id">
            <div class="form-group">
              <label class="form-label" for="edit_project_name">Project Name</label>
              <input type="text" id="edit_project_name" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="edit_project_type">Project Type</label>
              <input type="text" id="edit_project_type" class="form-input" required>
              <small style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; display: block;">
                Use lowercase with underscores (e.g., water_pump, smart_light, temperature_sensor)
              </small>
            </div>
            <div class="form-group">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="edit_ml_enabled">
                <label class="form-label" for="edit_ml_enabled" style="margin: 0;">Enable ML Script</label>
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin: 0;">Custom Fields (for Devices)</label>
                <button type="button" class="btn btn-secondary" onclick="addCustomFieldEdit()">Add Field</button>
              </div>
              <div id="edit-custom-fields-container" style="display: flex; flex-direction: column; gap: 1rem;">
              </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <label class="form-label" style="margin: 0;">Realtime Data Fields</label>
                <button type="button" class="btn btn-secondary" onclick="addRealtimeFieldEdit()">Add Field</button>
              </div>
              <small style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem; display: block;">
                Realtime data can be edited from ESP32 devices and the dashboard
              </small>
              <div id="edit-realtime-fields-container" style="display: flex; flex-direction: column; gap: 1rem;">
              </div>
            </div>

            <div class="actions">
              <button type="submit" class="btn btn-primary">Update Project</button>
              <button type="button" class="btn btn-secondary" onclick="hideEditProjectModal()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  loadProjectList();

  window.updateActiveNav('projects');
}

async function loadProjectList() {
  const listContainer = document.getElementById('project-list');

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listContainer.innerHTML = `<div class="empty-state">Error loading projects: ${error.message}</div>`;
    return;
  }

  if (!projects || projects.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>No projects created yet</p>
      </div>
    `;
    return;
  }

  const projectsWithDevices = await Promise.all(
    projects.map(async (project) => {
      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.project_id);

      return { ...project, deviceCount: count || 0 };
    })
  );

  listContainer.innerHTML = `
    <div class="grid grid-2">
      ${projectsWithDevices.map(project => `
        <div class="project-card" onclick="window.router.navigate('/project?id=${project.project_id}')">
          <div class="project-type">
            <span class="badge badge-info">${project.project_type.replace('_', ' ')}</span>
            ${project.ml_enabled ? '<span class="badge badge-success" style="margin-left: 0.5rem;">ML</span>' : ''}
          </div>
          <div class="project-name">${project.project_name}</div>
          <div class="project-id">${project.project_id}</div>
          <div style="margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
            ${project.deviceCount} device${project.deviceCount !== 1 ? 's' : ''}
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
            Created ${formatDate(project.created_at)}
          </div>
          <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${project.ml_enabled ? `
              <button
                class="btn btn-small btn-primary"
                onclick="event.stopPropagation(); window.router.navigate('/project/ml-script?id=${project.project_id}')"
              >
                ML Script
              </button>
            ` : ''}
            <button
              class="btn btn-small btn-secondary"
              onclick="event.stopPropagation(); editProject('${project.project_id}')"
            >
              Edit
            </button>
            <button
              class="btn btn-small btn-danger"
              onclick="event.stopPropagation(); deleteProject('${project.project_id}')"
            >
              Delete
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

let customFieldCounter = 0;

window.addCustomField = function() {
  const container = document.getElementById('custom-fields-container');
  const fieldId = `field-${customFieldCounter++}`;

  const fieldHtml = `
    <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Label</label>
          <input type="text" class="form-input field-label" placeholder="e.g., Tank Height" required>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Field Name</label>
          <input type="text" class="form-input field-name" placeholder="e.g., tank_height" required>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Type</label>
          <select class="form-select field-type" onchange="toggleFieldOptions(this, '${fieldId}')">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div style="flex: 1;">
          <label class="form-label">
            <input type="checkbox" class="field-required" style="margin-right: 0.5rem;">
            Required
          </label>
        </div>
      </div>
      <div class="field-options-container" style="display: none; margin-bottom: 0.75rem;">
        <label class="form-label">Options (comma-separated)</label>
        <input type="text" class="form-input field-options" placeholder="e.g., rectangular, cylindrical, spherical">
      </div>
      <button type="button" class="btn btn-danger btn-small" onclick="removeCustomField('${fieldId}')">Remove Field</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', fieldHtml);
};

window.addCustomFieldEdit = function() {
  const container = document.getElementById('edit-custom-fields-container');
  const fieldId = `edit-field-${customFieldCounter++}`;

  const fieldHtml = `
    <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Label</label>
          <input type="text" class="form-input field-label" placeholder="e.g., Tank Height" required>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Field Name</label>
          <input type="text" class="form-input field-name" placeholder="e.g., tank_height" required>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Type</label>
          <select class="form-select field-type" onchange="toggleFieldOptions(this, '${fieldId}')">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div style="flex: 1;">
          <label class="form-label">
            <input type="checkbox" class="field-required" style="margin-right: 0.5rem;">
            Required
          </label>
        </div>
      </div>
      <div class="field-options-container" style="display: none; margin-bottom: 0.75rem;">
        <label class="form-label">Options (comma-separated)</label>
        <input type="text" class="form-input field-options" placeholder="e.g., rectangular, cylindrical, spherical">
      </div>
      <button type="button" class="btn btn-danger btn-small" onclick="removeCustomField('${fieldId}')">Remove Field</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', fieldHtml);
};

window.toggleFieldOptions = function(selectElement, fieldId) {
  const fieldItem = document.getElementById(fieldId);
  const optionsContainer = fieldItem.querySelector('.field-options-container');

  if (selectElement.value === 'select') {
    optionsContainer.style.display = 'block';
  } else {
    optionsContainer.style.display = 'none';
  }
};

window.removeCustomField = function(fieldId) {
  document.getElementById(fieldId).remove();
};

let realtimeFieldCounter = 0;

window.addRealtimeField = function() {
  const container = document.getElementById('realtime-fields-container');
  const fieldId = `rt-field-${realtimeFieldCounter++}`;

  const fieldHtml = `
    <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Label</label>
          <input type="text" class="form-input rt-field-label" placeholder="e.g., Temperature" required>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Field Name</label>
          <input type="text" class="form-input rt-field-name" placeholder="e.g., temperature" required>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Type</label>
          <select class="form-select rt-field-type">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Default Value</label>
          <input type="text" class="form-input rt-field-default" placeholder="Optional">
        </div>
      </div>
      <button type="button" class="btn btn-danger btn-small" onclick="removeRealtimeField('${fieldId}')">Remove Field</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', fieldHtml);
};

window.addRealtimeFieldEdit = function() {
  const container = document.getElementById('edit-realtime-fields-container');
  const fieldId = `edit-rt-field-${realtimeFieldCounter++}`;

  const fieldHtml = `
    <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Label</label>
          <input type="text" class="form-input rt-field-label" placeholder="e.g., Temperature" required>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Field Name</label>
          <input type="text" class="form-input rt-field-name" placeholder="e.g., temperature" required>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <label class="form-label">Field Type</label>
          <select class="form-select rt-field-type">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>
        <div style="flex: 1;">
          <label class="form-label">Default Value</label>
          <input type="text" class="form-input rt-field-default" placeholder="Optional">
        </div>
      </div>
      <button type="button" class="btn btn-danger btn-small" onclick="removeRealtimeField('${fieldId}')">Remove Field</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', fieldHtml);
};

window.removeRealtimeField = function(fieldId) {
  document.getElementById(fieldId).remove();
};

function getCustomFieldsFromForm(containerId) {
  const container = document.getElementById(containerId);
  const fieldItems = container.querySelectorAll('.custom-field-item');
  const fields = [];

  fieldItems.forEach(item => {
    const label = item.querySelector('.field-label')?.value;
    const name = item.querySelector('.field-name')?.value;

    if (!label || !name) return;

    const type = item.querySelector('.field-type').value;
    const required = item.querySelector('.field-required')?.checked || false;
    const optionsInput = item.querySelector('.field-options')?.value;

    const field = { name, label, type, required };

    if (type === 'select' && optionsInput) {
      field.options = optionsInput.split(',').map(opt => opt.trim()).filter(opt => opt);
    }

    fields.push(field);
  });

  return fields;
}

function getRealtimeFieldsFromForm(containerId) {
  const container = document.getElementById(containerId);
  const fieldItems = container.querySelectorAll('.custom-field-item');
  const fields = [];

  fieldItems.forEach(item => {
    const label = item.querySelector('.rt-field-label')?.value;
    const name = item.querySelector('.rt-field-name')?.value;

    if (!label || !name) return;

    const type = item.querySelector('.rt-field-type').value;
    const defaultValue = item.querySelector('.rt-field-default')?.value || '';

    const field = { name, label, type };
    if (defaultValue) {
      field.default = defaultValue;
    }

    fields.push(field);
  });

  return fields;
}

window.deleteProject = async function(projectId) {
  if (!confirm('Are you sure you want to delete this project? This will also delete all associated devices and telemetry data.')) {
    return;
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    showNotification('Error deleting project: ' + error.message, 'error');
    return;
  }

  showNotification('Project deleted successfully', 'success');
  loadProjectList();
};

window.editProject = async function(projectId) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !project) {
    showNotification('Error loading project: ' + (error?.message || 'Not found'), 'error');
    return;
  }

  document.getElementById('edit_project_id').value = project.project_id;
  document.getElementById('edit_project_name').value = project.project_name;
  document.getElementById('edit_project_type').value = project.project_type;
  document.getElementById('edit_ml_enabled').checked = project.ml_enabled || false;

  const container = document.getElementById('edit-custom-fields-container');
  container.innerHTML = '';

  const customFields = project.custom_fields || [];
  customFields.forEach(field => {
    const fieldId = `edit-field-${customFieldCounter++}`;
    const fieldHtml = `
      <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
        <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="flex: 1;">
            <label class="form-label">Field Label</label>
            <input type="text" class="form-input field-label" value="${field.label}" required>
          </div>
          <div style="flex: 1;">
            <label class="form-label">Field Name</label>
            <input type="text" class="form-input field-name" value="${field.name}" required>
          </div>
        </div>
        <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="flex: 1;">
            <label class="form-label">Field Type</label>
            <select class="form-select field-type" onchange="toggleFieldOptions(this, '${fieldId}')">
              <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
              <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
              <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
              <option value="select" ${field.type === 'select' ? 'selected' : ''}>Select</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label class="form-label">
              <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''} style="margin-right: 0.5rem;">
              Required
            </label>
          </div>
        </div>
        <div class="field-options-container" style="display: ${field.type === 'select' ? 'block' : 'none'}; margin-bottom: 0.75rem;">
          <label class="form-label">Options (comma-separated)</label>
          <input type="text" class="form-input field-options" value="${field.options ? field.options.join(', ') : ''}">
        </div>
        <button type="button" class="btn btn-danger btn-small" onclick="removeCustomField('${fieldId}')">Remove Field</button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', fieldHtml);
  });

  const rtContainer = document.getElementById('edit-realtime-fields-container');
  rtContainer.innerHTML = '';

  const realtimeFields = project.realtime_fields || [];
  realtimeFields.forEach(field => {
    const fieldId = `edit-rt-field-${realtimeFieldCounter++}`;
    const fieldHtml = `
      <div class="custom-field-item" id="${fieldId}" style="border: 1px solid var(--border); padding: 1rem; border-radius: 8px; background: var(--bg-secondary);">
        <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="flex: 1;">
            <label class="form-label">Field Label</label>
            <input type="text" class="form-input rt-field-label" value="${field.label}" required>
          </div>
          <div style="flex: 1;">
            <label class="form-label">Field Name</label>
            <input type="text" class="form-input rt-field-name" value="${field.name}" required>
          </div>
        </div>
        <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="flex: 1;">
            <label class="form-label">Field Type</label>
            <select class="form-select rt-field-type">
              <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
              <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
              <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label class="form-label">Default Value</label>
            <input type="text" class="form-input rt-field-default" value="${field.default || ''}" placeholder="Optional">
          </div>
        </div>
        <button type="button" class="btn btn-danger btn-small" onclick="removeRealtimeField('${fieldId}')">Remove Field</button>
      </div>
    `;
    rtContainer.insertAdjacentHTML('beforeend', fieldHtml);
  });

  document.getElementById('edit-project-modal').style.display = 'flex';
};

window.showCreateProjectModal = function() {
  document.getElementById('custom-fields-container').innerHTML = '';
  document.getElementById('realtime-fields-container').innerHTML = '';
  document.getElementById('create-project-modal').style.display = 'flex';
};

window.hideCreateProjectModal = function() {
  document.getElementById('create-project-modal').style.display = 'none';
  document.getElementById('create-project-form').reset();
  document.getElementById('custom-fields-container').innerHTML = '';
  document.getElementById('realtime-fields-container').innerHTML = '';
};

window.hideEditProjectModal = function() {
  document.getElementById('edit-project-modal').style.display = 'none';
  document.getElementById('edit-project-form').reset();
  document.getElementById('edit-custom-fields-container').innerHTML = '';
  document.getElementById('edit-realtime-fields-container').innerHTML = '';
};

window.addEventListener('DOMContentLoaded', () => {
  const createForm = document.getElementById('create-project-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const projectId = document.getElementById('project_id').value;
      const projectName = document.getElementById('project_name').value;
      const projectType = document.getElementById('project_type').value;
      const mlEnabled = document.getElementById('ml_enabled').checked;
      const customFields = getCustomFieldsFromForm('custom-fields-container');
      const realtimeFields = getRealtimeFieldsFromForm('realtime-fields-container');

      const { error } = await supabase
        .from('projects')
        .insert({
          project_id: projectId,
          project_name: projectName,
          project_type: projectType,
          ml_enabled: mlEnabled,
          custom_fields: customFields,
          realtime_fields: realtimeFields,
        });

      if (error) {
        showNotification('Error creating project: ' + error.message, 'error');
        return;
      }

      showNotification('Project created successfully', 'success');
      window.hideCreateProjectModal();
      loadProjectList();

      if (mlEnabled) {
        setTimeout(() => {
          window.router.navigate(`/project/ml-script?id=${projectId}`);
        }, 500);
      }
    });
  }

  const editForm = document.getElementById('edit-project-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const projectId = document.getElementById('edit_project_id').value;
      const projectName = document.getElementById('edit_project_name').value;
      const projectType = document.getElementById('edit_project_type').value;
      const mlEnabled = document.getElementById('edit_ml_enabled').checked;
      const customFields = getCustomFieldsFromForm('edit-custom-fields-container');
      const realtimeFields = getRealtimeFieldsFromForm('edit-realtime-fields-container');

      const { error } = await supabase
        .from('projects')
        .update({
          project_name: projectName,
          project_type: projectType,
          ml_enabled: mlEnabled,
          custom_fields: customFields,
          realtime_fields: realtimeFields,
        })
        .eq('project_id', projectId);

      if (error) {
        showNotification('Error updating project: ' + error.message, 'error');
        return;
      }

      showNotification('Project updated successfully', 'success');
      window.hideEditProjectModal();
      loadProjectList();
    });
  }
});
