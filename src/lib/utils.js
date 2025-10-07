export function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

export function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

export function calculateTankVolume(shape, height, width, length) {
  if (!shape || !height) return null;

  switch(shape) {
    case 'cylinder':
      const radius = width / 2;
      return Math.PI * radius * radius * height;
    case 'rectangular':
      return height * width * length;
    default:
      return null;
  }
}
