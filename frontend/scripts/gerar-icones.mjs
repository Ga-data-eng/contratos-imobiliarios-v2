/**
 * Gera os ícones PNG do PWA (public/icone-192.png e public/icone-512.png).
 *
 * Escrito à mão com zlib para não trazer nenhuma dependência de imagem ao
 * projeto. Rode com: node scripts/gerar-icones.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length, 0);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo), 0);
  return Buffer.concat([tamanho, corpo, crc]);
}

function montarPng(lado, pixels) {
  const linhas = [];
  for (let y = 0; y < lado; y += 1) {
    linhas.push(Buffer.from([0]));
    linhas.push(Buffer.from(pixels.subarray(y * lado * 3, (y + 1) * lado * 3)));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Fundo na cor da marca com uma "folha de contrato" branca e linhas de texto. */
function desenharIcone(lado) {
  const pixels = new Uint8Array(lado * lado * 3);
  const fundo = [29, 58, 216]; // marca-700
  const papel = [255, 255, 255];
  const traco = [148, 163, 184]; // slate-400

  const definir = (x, y, cor) => {
    if (x < 0 || y < 0 || x >= lado || y >= lado) return;
    const i = (y * lado + x) * 3;
    pixels[i] = cor[0];
    pixels[i + 1] = cor[1];
    pixels[i + 2] = cor[2];
  };

  const retangulo = (x0, y0, x1, y1, cor) => {
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) definir(x, y, cor);
  };

  retangulo(0, 0, lado, lado, fundo);

  const margem = Math.round(lado * 0.24);
  const dobra = Math.round(lado * 0.16);
  retangulo(margem, Math.round(lado * 0.18), lado - margem, lado - Math.round(lado * 0.18), papel);

  // canto dobrado do documento
  for (let i = 0; i < dobra; i += 1) {
    for (let x = lado - margem - dobra + i; x < lado - margem; x += 1) {
      definir(x, Math.round(lado * 0.18) + i, fundo);
    }
  }

  // linhas de texto
  const alturaLinha = Math.max(2, Math.round(lado * 0.035));
  let y = Math.round(lado * 0.42);
  for (let n = 0; n < 3; n += 1) {
    const largura = n === 2 ? 0.6 : 1;
    retangulo(
      margem + Math.round(lado * 0.07),
      y,
      margem + Math.round((lado - 2 * margem - lado * 0.14) * largura) + Math.round(lado * 0.07),
      y + alturaLinha,
      traco,
    );
    y += Math.round(lado * 0.1);
  }

  return montarPng(lado, pixels);
}

mkdirSync(join(RAIZ, 'public'), { recursive: true });
for (const lado of [192, 512]) {
  const arquivo = join(RAIZ, 'public', `icone-${lado}.png`);
  writeFileSync(arquivo, desenharIcone(lado));
  console.log(`gerado: ${arquivo}`);
}
