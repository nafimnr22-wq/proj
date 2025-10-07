import { supabase } from '../lib/supabase.js';
import { renderWaterPumpDashboard } from './water-pump.js';
import { renderSmartLightDashboard } from './smart-light.js';

export async function renderProjectDetail(params) {
  const projectId = params.get('id');

  if (!projectId) {
    window.router.navigate('/projects');
    return;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !project) {
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
        <div class="empty-state">Project not found</div>
      </div>
    `;
    return;
  }

  switch (project.project_type) {
    case 'water_pump':
      await renderWaterPumpDashboard(project);
      break;
    case 'smart_light':
      await renderSmartLightDashboard(project);
      break;
    default:
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
          <div class="empty-state">Unknown project type</div>
        </div>
      `;
  }
}
