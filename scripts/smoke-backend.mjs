import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const backendRepositoryPath = resolve(process.cwd(), '..', 'use-web-backend');
const baseUrl = stripTrailingSlash(
  process.env.USE_WEB_BACKEND_URL ??
    process.env.VITE_API_BASE_URL ??
    'http://localhost:8080/api/v1',
);

async function main() {
  assertBackendRepositoryExists();

  const health = await request('/health');
  assertEqual(health.status, 'UP', 'Health endpoint status');
  assertEqual(health.service, 'use-web-backend', 'Health endpoint service');

  const createdProject = await request('/projects', {
    method: 'POST',
    body: {
      name: 'Frontend Backend Smoke Test',
      description: 'Created by use-web-frontend smoke:backend.',
      template: 'empty',
    },
  });
  const projectId = readProjectId(createdProject);

  if (!projectId) {
    throw new Error('POST /projects did not return project.id.');
  }

  const loadedProject = await request(`/projects/${encodeURIComponent(projectId)}`);
  assertEqual(readProjectId(loadedProject), projectId, 'Loaded project id');

  const savedProject = await request(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    body: loadedProject,
  });
  assertEqual(readProjectId(savedProject), projectId, 'Saved project id');

  const recentProjects = await request('/projects/recent');
  if (!Array.isArray(recentProjects)) {
    throw new Error('GET /projects/recent did not return an array.');
  }

  const missingProjectUrl = `${baseUrl}/projects/__missing_frontend_smoke_test__`;
  const missingProjectResponse = await fetch(missingProjectUrl).catch((error) => {
    throw new Error(`GET ${missingProjectUrl} failed: ${error.message}`);
  });
  if (missingProjectResponse.status !== 404) {
    throw new Error(
      `Expected missing project request to return 404, got ${missingProjectResponse.status}.`,
    );
  }

  const errorBody = await missingProjectResponse.json();
  if (!errorBody.code || !errorBody.message) {
    throw new Error('404 response does not match ApiErrorDto shape.');
  }

  console.log(`Backend smoke test passed against ${baseUrl}`);
  console.log(`Created and loaded project ${projectId}`);
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }).catch((error) => {
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${error.message}`);
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method ?? 'GET'} ${path} failed with ${response.status}: ${text}`);
  }

  return response.json();
}

function assertBackendRepositoryExists() {
  if (!existsSync(backendRepositoryPath)) {
    throw new Error(`Expected backend repository at ${backendRepositoryPath}.`);
  }
}

function readProjectId(project) {
  return project?.project?.id ?? project?.id;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch. Expected ${expected}, got ${actual}.`);
  }
}

function stripTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
