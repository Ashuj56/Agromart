import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total request count',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestsErrorsTotal = new Counter({
  name: 'http_requests_errors_total',
  help: 'Watched by Prometheus alert rule for self-healing',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: statusCode }, duration);

    if (res.statusCode >= 400) {
      httpRequestsErrorsTotal.inc({ method: req.method, route, status_code: statusCode });
    }
  });

  next();
}
