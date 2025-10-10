import { router } from './lib/router.js';
import { renderHome } from './pages/home.js';
import { renderFirmware } from './pages/firmware.js';
import { renderDeviceList } from './pages/devices.js';
import { renderProjectList } from './pages/projects.js';
import { renderProjectDetail } from './pages/project-detail.js';
import { renderDeviceTelemetry } from './pages/device-telemetry.js';
import { renderProjectTelemetry } from './pages/project-telemetry.js';
import { renderMLScriptEditor } from './pages/ml-script-editor.js';
import { renderRealtimeData } from './pages/realtime-data.js';
import './lib/device-manager.js';

window.router = router;

router.register('/', renderHome);
router.register('/firmware', renderFirmware);
router.register('/devices', renderDeviceList);
router.register('/device/telemetry', renderDeviceTelemetry);
router.register('/device/realtime', renderRealtimeData);
router.register('/projects', renderProjectList);
router.register('/project', renderProjectDetail);
router.register('/project/telemetry', (params) => renderProjectTelemetry(params.get('id')));
router.register('/project/ml-script', renderMLScriptEditor);

router.init();
