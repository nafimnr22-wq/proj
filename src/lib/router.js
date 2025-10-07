export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;

    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  handleRoute() {
    const path = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);

    let handler = this.routes[path];

    if (!handler) {
      const matchedRoute = Object.keys(this.routes).find(route => {
        const regex = new RegExp('^' + route.replace(/:\w+/g, '([^/]+)') + '$');
        return regex.test(path);
      });

      if (matchedRoute) {
        handler = this.routes[matchedRoute];
      }
    }

    if (handler) {
      this.currentRoute = path;
      handler(params);
    } else {
      this.routes['/']?.();
    }
  }

  init() {
    this.handleRoute();
  }
}

export const router = new Router();
