import express, { Router } from 'express';
import { exigirPerfil } from '../middlewares/autorizar';
import { LIMITE_FOTO, pastaUploads, salvarFoto } from './upload';

/*
POST /fotos: o corpo é a própria imagem (Content-Type image/*), sem multipart.
Só INSTITUICAO e ADMIN enviam fotos (animais e instituições). O envio apenas guarda o arquivo e devolve o
caminho; quem associa a foto a um registro é o PUT/POST normal, que já confere a propriedade do registro.
*/
export const rotasUpload = Router();
rotasUpload.post('/', exigirPerfil('INSTITUICAO', 'ADMIN'), express.raw({ type: 'image/*', limit: LIMITE_FOTO }), async (req, res) => {
  res.status(201).json({ foto: await salvarFoto(req.body) });
});

/** Serve os arquivos gravados; nomes aleatórios (UUID), sem listagem de pasta e sem inferência de tipo pelo navegador. */
export const servirUploads = () => express.static(pastaUploads(), {
  index: false, dotfiles: 'ignore', redirect: false, maxAge: '30d', immutable: true,
  setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "default-src 'none'"); },
});
