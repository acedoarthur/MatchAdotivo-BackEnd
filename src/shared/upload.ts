import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BadRequestError, AppError } from './errors';

/*
Fotos enviadas pelos usuários. Ficam em disco, em UPLOADS_DIR (padrão: ./uploads na raiz do back-end),
e são servidas publicamente em GET /uploads/<arquivo>. O banco guarda apenas o caminho relativo
("/uploads/<uuid>.jpg") no campo foto; fotos antigas cadastradas por URL continuam valendo.
*/
export const LIMITE_FOTO = 5 * 1024 * 1024;
export const PREFIXO_UPLOADS = '/uploads/';
export const pastaUploads = () => resolve(process.env.UPLOADS_DIR ?? 'uploads');

// O tipo vem do conteúdo (assinatura do arquivo), nunca do nome ou do cabeçalho informado pelo cliente.
// SVG fica de fora de propósito: pode carregar scripts.
export function detectarImagem(b: Buffer): { ext: string; mime: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'))) return { ext: 'gif', mime: 'image/gif' };
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

/** Valida e grava a imagem com nome aleatório; devolve o caminho público (ex.: /uploads/<uuid>.png). */
export async function salvarFoto(corpo: unknown): Promise<string> {
  if (!Buffer.isBuffer(corpo) || corpo.length === 0) throw new BadRequestError('Envie o arquivo da imagem no corpo da requisição (Content-Type image/*).');
  const tipo = detectarImagem(corpo);
  if (!tipo) throw new AppError('Formato não suportado. Envie uma imagem JPG, PNG, GIF ou WebP.', 415);
  const pasta = pastaUploads();
  await mkdir(pasta, { recursive: true });
  const nome = `${randomUUID()}.${tipo.ext}`;
  await writeFile(resolve(pasta, nome), corpo, { flag: 'wx' });
  return `${PREFIXO_UPLOADS}${nome}`;
}
