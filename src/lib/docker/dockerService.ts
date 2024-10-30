import { getApiHeaders } from '@/lib/utils/api';

interface DockerResponse {
  ok: boolean;
  message: string;
  error?: string;
  id?: string;
}

export const dockerService = {
  async fetchDockerfiles() {
    const response = await fetch('/api/docker', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ action: 'listDockerfiles' }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },

  async buildImage(dockerfile: string): Promise<DockerResponse> {
    const response = await fetch('/api/docker', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        action: 'buildImage',
        dockerfile,
      }),
    });
    return response.json();
  },

  async startContainer(imageName: string): Promise<DockerResponse> {
    const response = await fetch('/api/docker', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        action: 'startContainer',
        imageName,
        isLocalDockerfile: true,
      }),
    });
    return response.json();
  },

  async stopContainer(containerId: string): Promise<DockerResponse> {
    const response = await fetch('/api/docker', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ action: 'stopContainer', containerId }),
    });
    return response.json();
  },

  async deleteContainer(): Promise<DockerResponse> {
    const response = await fetch('/api/docker', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ action: 'deleteContainer' }),
    });
    return response.json();
  },
};
