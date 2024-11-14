import Docker from 'dockerode';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import net from 'net';
import { NextResponse } from 'next/server';
import path from 'path';
import { type ClientChannel, Client as SSH2Client } from 'ssh2';

const docker = new Docker();
const sshClient = new SSH2Client();
const DOCKERFILE_DIR = path.join(process.cwd(), 'data', 'dockerfiles');
const CONTAINER_NAME = 'llm-controlled-computer';
const DEFAULT_LOCAL_IMAGE_NAME = 'llm-computer-local:latest';

const buildEmitter = new EventEmitter();

// Add a new EventEmitter for container status
const statusEmitter = new EventEmitter();

interface DockerActionBody {
  action:
    | 'startContainer'
    | 'stopContainer'
    | 'executeCommand'
    | 'listDockerfiles'
    | 'buildImage'
    | 'getContainerStatus'
    | 'deleteContainer'
    | 'checkVncStatus';
  imageName?: string;
  dockerfile?: string;
  containerId?: string;
  command?: string;
  isLocalDockerfile?: boolean;
}

export async function POST(request: Request) {
  const body: DockerActionBody = await request.json();

  switch (body.action) {
    case 'startContainer':
      return startContainer({
        imageName: body.imageName,
        isLocalDockerfile: body.isLocalDockerfile,
      });
    case 'buildImage':
      if (!body.dockerfile) {
        return NextResponse.json(
          { message: 'Dockerfile is required for building', ok: false },
          { status: 400 }
        );
      }
      try {
        await buildImage(body.dockerfile, DEFAULT_LOCAL_IMAGE_NAME);
        return NextResponse.json({ message: 'Image build started', ok: true });
      } catch (error) {
        return NextResponse.json(
          { message: 'Failed to start image build', error: String(error), ok: false },
          { status: 500 }
        );
      }
    case 'stopContainer':
      if (!body.containerId) {
        return NextResponse.json(
          { message: 'Container ID is required', ok: false },
          { status: 400 }
        );
      }
      return await stopContainer(body.containerId);
    case 'executeCommand':
      return await executeCommand(body.command);
    case 'listDockerfiles':
      return await listDockerfiles();
    case 'getContainerStatus':
      if (!body.containerId) {
        return NextResponse.json(
          { message: 'Container ID is required', ok: false },
          { status: 400 }
        );
      }
      return await getContainerStatus(body.containerId);
    case 'deleteContainer':
      return await deleteContainer();
    case 'checkVncStatus':
      if (!body.containerId) {
        return NextResponse.json(
          { message: 'Container ID is required', ok: false },
          { status: 400 }
        );
      }
      return await checkVncStatus(body.containerId);
    default:
      return NextResponse.json({ message: 'Invalid action', ok: false }, { status: 400 });
  }
}

async function startContainer(options: { imageName?: string; isLocalDockerfile?: boolean }) {
  const { imageName = 'Dockerfile', isLocalDockerfile = false } = options;

  try {
    let targetImageName = imageName;

    if (isLocalDockerfile) {
      // For local Dockerfiles, use a standardized image name
      targetImageName = DEFAULT_LOCAL_IMAGE_NAME;

      // Build the image from local Dockerfile
      await buildImage(imageName, targetImageName);
    }

    // Check if the container already exists
    const containers = await docker.listContainers({ all: true });
    const existingContainer = containers.find((container) =>
      container.Names.includes(`/${CONTAINER_NAME}`)
    );

    if (existingContainer) {
      const container = docker.getContainer(existingContainer.Id);
      if (existingContainer.State !== 'running') {
        await container.start();
      }
      return NextResponse.json({
        message: 'Container started',
        id: existingContainer.Id,
        ok: true,
      });
    }

    // Create and start a new container
    const container = await docker.createContainer({
      Image: targetImageName,
      name: CONTAINER_NAME,
      ExposedPorts: {
        '5900/tcp': {},
        '8501/tcp': {},
        '6080/tcp': {},
        '8080/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5900/tcp': [{ HostPort: '5900' }],
          '8501/tcp': [{ HostPort: '8501' }],
          '6080/tcp': [{ HostPort: '6080' }],
          '8080/tcp': [{ HostPort: '8080' }],
        },
      },
      Env: [`ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`, 'WIDTH=1920', 'HEIGHT=1080'],
    });

    await container.start();
    const info = await container.inspect();
    return NextResponse.json({ message: 'Container started', id: info.Id, ok: true });
  } catch (error) {
    console.error('Error starting container:', error);
    return NextResponse.json(
      { message: 'Failed to start container', error: String(error), ok: false },
      { status: 500 }
    );
  }
}

async function stopContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.stop();
  return NextResponse.json({ message: 'Container stopped', ok: true });
}

async function executeCommand(command?: string) {
  if (!command) {
    return NextResponse.json({ message: 'Command is required', ok: false }, { status: 400 });
  }

  const output = await new Promise<string>((resolve, reject) => {
    sshClient.exec(command, (err: Error | undefined, stream: ClientChannel) => {
      if (err) reject(err);
      let output = '';
      stream.on('data', (data: Buffer) => {
        output += data.toString();
      });
      stream.on('close', () => {
        resolve(output);
      });
    });
  });

  return NextResponse.json({ output });
}

async function listDockerfiles() {
  const files = await fs.readdir(DOCKERFILE_DIR);
  const dockerfiles = files.filter((file) => file.toLowerCase().includes('dockerfile'));
  return NextResponse.json({ dockerfiles });
}

async function buildImage(dockerfile: string, imageName: string) {
  try {
    const files = await fs.readdir(DOCKERFILE_DIR);
    const buildContext = {
      context: DOCKERFILE_DIR,
      src: files,
    };

    const buildOptions: Docker.ImageBuildOptions = {
      t: imageName,
      dockerfile,
      nocache: false,
      pull: 'true',
      buildargs: {
        BUILDKIT_INLINE_CACHE: '1',
      },
    };

    const stream = await docker.buildImage(buildContext, buildOptions);
    console.log('Build stream created with caching enabled');

    // Emit initial build start event
    buildEmitter.emit('progress', {
      stream: '',
      status: 'started',
    });

    docker.modem.followProgress(
      stream,
      (err, _result) => {
        if (err) {
          console.error('Build error:', err);
          buildEmitter.emit('progress', {
            stream: err.message,
            status: 'error',
          });
        } else {
          // console.log('Build completed:', result);
          buildEmitter.emit('progress', {
            stream: 'Build completed successfully',
            status: 'completed',
          });
        }
      },
      (event) => {
        // console.log('Build event:', event);
        buildEmitter.emit('progress', {
          stream: event.stream || event.status || '',
          status: 'building',
        });
      }
    );

    return Promise.resolve();
  } catch (error) {
    console.error('Error preparing build context:', error);
    throw error;
  }
}

// Modify the GET handler to support both build and status streams
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get('buildId');
  const statusId = searchParams.get('statusId');
  const containerId = searchParams.get('containerId');
  const apiKey = searchParams.get('apiKey');

  // Check API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (buildId) {
    // Existing build progress stream logic with headers
    return new Response(
      new ReadableStream({
        start(controller) {
          const listener = (event: unknown) => {
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
          };

          buildEmitter.on('progress', listener);

          request.signal.addEventListener('abort', () => {
            buildEmitter.removeListener('progress', listener);
          });
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  } else if (statusId && containerId) {
    // Container status stream with headers
    return new Response(
      new ReadableStream({
        start(controller) {
          const listener = (event: unknown) => {
            controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
          };

          statusEmitter.on('status', listener);
          emitContainerStatus(containerId);

          const intervalId = setInterval(() => {
            emitContainerStatus(containerId);
          }, 5000);

          request.signal.addEventListener('abort', () => {
            statusEmitter.removeListener('status', listener);
            clearInterval(intervalId);
          });
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  } else {
    return NextResponse.json(
      { message: 'Missing required parameters', ok: false },
      { status: 400 }
    );
  }
}

async function getContainerStatus(containerId: string) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    const status = info.State.Status;
    let details = '';

    if (status === 'exited') {
      details = `Exit code: ${info.State.ExitCode}\nError: ${info.State.Error || 'None'}\nFinished at: ${info.State.FinishedAt}`;
    } else if (status === 'running') {
      details = `Started at: ${info.State.StartedAt}\nPID: ${info.State.Pid}`;
    }

    return NextResponse.json({ status, details });
  } catch (error) {
    console.error('Error getting container status:', error);
    return NextResponse.json(
      { message: 'Failed to get container status', error: String(error), ok: false },
      { status: 500 }
    );
  }
}

async function deleteContainer() {
  try {
    const containers = await docker.listContainers({ all: true });
    const existingContainer = containers.find((container) =>
      container.Names.includes(`/${CONTAINER_NAME}`)
    );

    if (existingContainer) {
      const container = docker.getContainer(existingContainer.Id);
      if (existingContainer.State === 'running') {
        await container.stop();
      }
      await container.remove();
      return NextResponse.json({ message: 'Container deleted successfully', ok: true });
    } else {
      return NextResponse.json(
        { message: 'No container found to delete', ok: false },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting container:', error);
    return NextResponse.json(
      { message: 'Failed to delete container', error: String(error), ok: false },
      { status: 500 }
    );
  }
}

// Add this new function to emit status updates
async function emitContainerStatus(containerId: string) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    const status = info.State.Status;
    let details = '';

    if (status === 'exited') {
      details = `Exit code: ${info.State.ExitCode}\nError: ${info.State.Error || 'None'}\nFinished at: ${info.State.FinishedAt}`;
    } else if (status === 'running') {
      details = `Started at: ${info.State.StartedAt}\nPID: ${info.State.Pid}`;
    }

    statusEmitter.emit('status', { status, details });
  } catch (error) {
    console.error('Error getting container status:', error);
    statusEmitter.emit('status', {
      status: 'error',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function checkVncStatus(containerId: string) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();

    if (info.State.Status !== 'running') {
      return NextResponse.json({ ready: false });
    }

    // Check both VNC and websockify ports
    const vncReady = await checkPort(5900);
    const websockifyReady = await checkPort(6080);

    return NextResponse.json({ ready: vncReady && websockifyReady });
  } catch (error) {
    return NextResponse.json({ ready: false });
  }
}

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve(false);
    }, 1000);

    client.connect(port, 'localhost', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve(true);
    });

    client.on('error', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve(false);
    });
  });
}
