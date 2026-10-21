import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:8080/v1/departments', {
    headers: { 'Authorization': 'Bearer TOKEN_DE_PRUEBA' },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'respuesta JSON válida': (r) => {
      try {
        const data = r.json();
        return Array.isArray(data);
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
