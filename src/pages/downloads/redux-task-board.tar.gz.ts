import { gzipSync } from 'node:zlib';

const sources = import.meta.glob<string>(
  '../../courses/redux/project/*.{ts,tsx,css,html,json,md}',
  { eager: true, query: '?raw', import: 'default' },
);

function tarEntry(name: string, content: string) {
  const body = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'ascii');
  header.write('0000644\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  header.write(body.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  header.write('00000000000\0', 136, 'ascii');
  header.fill(0x20, 148, 156);
  header.write('0', 156, 'ascii');
  header.write('ustar\0' + '00', 257, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
  return [header, body, Buffer.alloc((512 - body.length % 512) % 512)];
}

export function GET() {
  const entries = Object.entries(sources).sort(([a], [b]) => a.localeCompare(b));
  const archive = gzipSync(Buffer.concat([
    ...entries.flatMap(([path, content]) => tarEntry('redux-task-board/' + path.split('/').at(-1), content)),
    Buffer.alloc(1024),
  ]));
  return new Response(new Uint8Array(archive), {
    headers: { 'Content-Type': 'application/gzip' },
  });
}
