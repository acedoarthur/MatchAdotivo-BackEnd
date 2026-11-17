import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErroHttp } from './validacao';

export const tratarErros: ErrorRequestHandler = (erro: unknown, req, res, next) => {
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ error: erro.message });
    return;
  }
  // Formato padrão dos erros de validação: o campo e a mensagem de cada problema.
  if (erro instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: erro.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message })),
    });
    return;
  }
  const info = erro as { sqlState?: string; type?: string; status?: number };
  if (info.sqlState === '23505') {
    res.status(409).json({ error: 'CPF/CNPJ já cadastrado ou animal com outra adoção aprovada.' });
  } else if (info.sqlState === '23503' || info.sqlState === '23001') {
    res.status(409).json({ error: 'Referência inexistente ou registro vinculado a outros dados.' });
  } else if (info.sqlState === '23514' || info.sqlState === '22001' || info.sqlState === '22007' || info.sqlState === '22008') {
    res.status(400).json({ error: 'Os dados violam as restrições do cadastro.' });
  } else if (info.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido.' });
  } else if (info.type === 'entity.too.large') {
    res.status(413).json({ error: 'O corpo excede o limite de 100 KB.' });
  } else if (erro instanceof URIError) {
    res.status(400).json({ error: 'Parâmetro de rota com codificação inválida.' });
  } else {
    console.error(erro);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
