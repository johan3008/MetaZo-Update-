import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const execPromise = util.promisify(exec);

async function test() {
  const ffmpegPath = ffmpegInstaller.path;
  console.log('ffmpeg path:', ffmpegPath);
  // generate dummy video
  await execPromise(`${ffmpegPath} -f lavfi -i testsrc=duration=10:size=640x360:rate=30 -pix_fmt yuv420p dummy.mp4`);
  
  // Try extracting frames super fast with -vf select
  const outDir = './tmp_frames';
  await execPromise(`mkdir -p ${outDir}`);
  
  // Extract 3 frames equidistant (start, middle, end)
  // Instead of ffprobe, if we don't know duration, we can just grab frames from the beginning.
  // BUT the prompt explicitly says "Start, Middle, End". 
  
  // A fast way: -vf "select='eq(n,0)+eq(n,100)+eq(n,200)'" -> not exactly middle, end.
  // Using ffprobe to get duration is fast!
  console.log('Done');
}
test().catch(console.error);
