import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SystemActionBody {
  action: 'moveMouse' | 'typeText' | 'takeScreenshot';
  x?: number;
  y?: number;
  text?: string;
}

export async function POST(request: Request) {
  const body: SystemActionBody = await request.json();

  try {
    switch (body.action) {
      case 'moveMouse':
        if (typeof body.x !== 'number' || typeof body.y !== 'number') {
          return NextResponse.json({ message: 'Invalid coordinates' }, { status: 400 });
        }
        await execAsync(`xdotool mousemove ${body.x} ${body.y}`);
        return NextResponse.json({ message: 'Mouse moved' });
      case 'typeText':
        if (typeof body.text !== 'string') {
          return NextResponse.json({ message: 'Invalid text' }, { status: 400 });
        }
        await execAsync(`xdotool type "${body.text}"`);
        return NextResponse.json({ message: 'Text typed' });
      case 'takeScreenshot':
        await execAsync('scrot -b -o /tmp/screenshot.png');
        return NextResponse.json({ screenshotPath: '/tmp/screenshot.png' });
      default:
        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error in system action:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
    } else {
      return NextResponse.json(
        { message: 'Server error', error: 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
