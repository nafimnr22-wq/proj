import { supabase } from '../lib/supabase.js';
import { showNotification } from '../lib/utils.js';

export async function renderMLScriptEditor(params) {
  const projectId = params.get('id');

  if (!projectId) {
    window.router.navigate('/projects');
    return;
  }

  const app = document.getElementById('app');

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !project) {
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
        <div class="empty-state">Project not found</div>
      </div>
    `;
    return;
  }

  const defaultScript = `# ML Training Script for ${project.project_name}
# This script will be used to train machine learning models for this project

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import joblib

def train_model(data):
    """
    Train a machine learning model using the provided data.

    Args:
        data: DataFrame containing the telemetry data

    Returns:
        trained_model: The trained ML model
    """
    # Example: Predict water level based on flow rates
    X = data[['flow_in_lpm', 'flow_out_lpm', 'net_flow_lpm']]
    y = data['level_pct']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)
    print(f"Model R² score: {score}")

    return model

def save_model(model, output_path):
    """Save the trained model to a file."""
    joblib.dump(model, output_path)
    print(f"Model saved to {output_path}")

if __name__ == "__main__":
    # This script will be executed by the training server
    pass
`;

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
        <h1 class="page-title">ML Script Editor</h1>
        <p class="page-description">Project: ${project.project_name} (${project.project_id})</p>
      </div>

      <div class="card">
        <h2 class="card-title">Python Training Script</h2>
        <p style="margin-bottom: 1rem; color: var(--text-secondary);">
          This script will be executed when training ML models for this project.
          ${project.ml_script_updated_at ? `Last updated: ${new Date(project.ml_script_updated_at).toLocaleString()}` : ''}
        </p>

        <form id="ml-script-form">
          <div class="form-group">
            <textarea
              id="ml-script"
              class="form-input"
              style="font-family: monospace; min-height: 500px; resize: vertical;"
              placeholder="Enter your Python training script here..."
            >${project.ml_script_content || defaultScript}</textarea>
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary">Save Script</button>
            <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/projects')">Cancel</button>
            <button type="button" class="btn btn-secondary" onclick="resetToDefault('${projectId}')">Reset to Default</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupMLScriptForm(projectId, defaultScript);

  window.updateActiveNav('projects');
}

function setupMLScriptForm(projectId, defaultScript) {
  const form = document.getElementById('ml-script-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const scriptContent = document.getElementById('ml-script').value;

    if (!scriptContent.trim()) {
      showNotification('Script cannot be empty', 'error');
      return;
    }

    const { error } = await supabase
      .from('projects')
      .update({
        ml_script_content: scriptContent,
        ml_script_updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId);

    if (error) {
      showNotification('Error saving script: ' + error.message, 'error');
      return;
    }

    showNotification('Script saved successfully', 'success');
  });
}

window.resetToDefault = function(projectId) {
  if (!confirm('Are you sure you want to reset the script to default? This cannot be undone.')) {
    return;
  }

  window.router.navigate(`/project/ml-script?id=${projectId}`);
  setTimeout(() => {
    location.reload();
  }, 100);
};
