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
        <div class="modal-content">
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
              <select id="project_type" class="form-select" required>
                <option value="">Select type</option>
                <option value="water_pump">Water Pump</option>
                <option value="smart_light">Smart Light</option>
              </select>
            </div>
            <div class="form-group">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="has_ml_script">
                <label class="form-label" for="has_ml_script" style="margin: 0;">Add ML Script</label>
              </div>
            </div>
            <div class="actions">
              <button type="submit" class="btn btn-primary">Create Project</button>
              <button type="button" class="btn btn-secondary" onclick="hideCreateProjectModal()">Cancel</button>
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
            ${project.has_ml_script ? '<span class="badge badge-success" style="margin-left: 0.5rem;">ML</span>' : ''}
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
            ${project.has_ml_script ? `
              <button
                class="btn btn-small btn-primary"
                onclick="event.stopPropagation(); window.router.navigate('/project/ml-script?id=${project.project_id}')"
              >
                Edit ML Script
              </button>
            ` : ''}
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

window.deleteProject = async function(projectId) {
  const apiKey = prompt('Enter API key to delete project:');

  if (!apiKey) {
    return;
  }

  if (apiKey !== 'demo-api-key-12345') {
    showNotification('Invalid API key', 'error');
    return;
  }

  if (!confirm('Are you sure you want to delete this project? This will also delete all associated devices.')) {
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

window.showCreateProjectModal = function() {
  document.getElementById('create-project-modal').style.display = 'flex';
};

window.hideCreateProjectModal = function() {
  document.getElementById('create-project-modal').style.display = 'none';
  document.getElementById('create-project-form').reset();
};

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('create-project-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const projectId = document.getElementById('project_id').value;
      const projectName = document.getElementById('project_name').value;
      const projectType = document.getElementById('project_type').value;
      const hasMLScript = document.getElementById('has_ml_script').checked;

      const { error } = await supabase
        .from('projects')
        .insert({
          project_id: projectId,
          project_name: projectName,
          project_type: projectType,
          has_ml_script: hasMLScript,
        });

      if (error) {
        showNotification('Error creating project: ' + error.message, 'error');
        return;
      }

      showNotification('Project created successfully', 'success');
      window.hideCreateProjectModal();
      loadProjectList();

      if (hasMLScript) {
        setTimeout(() => {
          window.router.navigate(`/project/ml-script?id=${projectId}`);
        }, 500);
      }
    });
  }
});
