import { deflateSync } from 'node:zlib';

/**
 * Gera um PNG pequeno com um traço "manuscrito" para popular as assinaturas
 * dos dados de exemplo. Evita depender de arquivos binários no repositório —
 * assinaturas reais vêm do canvas do frontend.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo: string, dados: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length, 0);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([tamanho, corpo, crc]);
}

/** PNG RGB (sem alfa) montado a partir de uma matriz de pixels. */
function montarPng(largura: number, altura: number, pixels: Uint8Array): Buffer {
  const linhas: Buffer[] = [];
  for (let y = 0; y < altura; y += 1) {
    linhas.push(Buffer.from([0])); // filtro "none"
    linhas.push(Buffer.from(pixels.subarray(y * largura * 3, (y + 1) * largura * 3)));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Devolve uma data URL PNG com um rabisco determinístico derivado do nome,
 * para que cada responsável tenha uma "assinatura" visualmente distinta.
 */
export function assinaturaDemo(nome: string): string {
  const largura = 300;
  const altura = 90;
  const pixels = new Uint8Array(largura * altura * 3).fill(255);

  const semente = [...nome].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7);
  const amplitude = 14 + (semente % 10);
  const frequencia = 0.05 + (semente % 7) / 200;
  const fase = (semente % 100) / 10;

  const pintar = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= largura || y >= altura) return;
    const i = (y * largura + x) * 3;
    pixels[i] = 23;
    pixels[i + 1] = 37;
    pixels[i + 2] = 84;
  };

  for (let x = 20; x < largura - 20; x += 1) {
    const t = x - 20;
    const y =
      altura / 2 +
      Math.sin(t * frequencia + fase) * amplitude +
      Math.sin(t * frequencia * 2.7 + fase) * (amplitude / 3) -
      t * 0.03;
    const yi = Math.round(y);
    for (let esp = -1; esp <= 1; esp += 1) pintar(x, yi + esp);
  }

  // linha de base da assinatura
  for (let x = 12; x < largura - 12; x += 1) pintar(x, altura - 12);

  return `data:image/png;base64,${montarPng(largura, altura, pixels).toString('base64')}`;
}
