import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';

export const tratarErros: ErrorRequestHandler = (erro: unknown, req, res, next) => {
  // Erros da aplicação (lançados pelos services e repositories): já trazem o status.
  if (erro instanceof AppError) {
    res.status(erro.statusCode).json({ error: erro.message });
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
  const info = erro as { type?: string; limit?: number };
  if (info.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido.' });
  } else if (info.type === 'entity.too.large') {
    res.status(413).json({ error: `O corpo excede o limite de ${Math.round((info.limit ?? 102400) / 1024)} KB.` });
  } else if (erro instanceof URIError) {
    res.status(400).json({ error: 'Parâmetro de rota com codificação inválida.' });
  } else {
    console.error(erro);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};
