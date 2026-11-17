import { Router } from 'express';
import { exigir } from './validacao';

export const rotasBasicas = Router();

rotasBasicas.get('/', (req, res) => {
  res.type('text').send('Bem-vindo ao Laboratório de Rotas de DAW-II — Match de Adoção!');
});

rotasBasicas.get('/sobre', (req, res) => {
  res.json({
    nome: 'Match de Adoção',
    descricao: 'Sistema para conectar instituições e adotantes, cadastrar animais, acompanhar vacinas e registrar solicitações de adoção.',
    entidades: ['Instituição', 'Animal', 'Vacina', 'Animal_Vacina', 'Adotante', 'Match'],
    armazenamento: 'PostgreSQL',
    orm: 'Prisma 8',
  });
});

rotasBasicas.get('/saudacao/:nome', (req, res) => {
  const nome = req.params.nome.trim();
  exigir(nome.length > 0, 'nome deve ser um texto não vazio.');
  res.type('text').send(`Olá, ${nome}!`);
});

rotasBasicas.get('/calculo/soma/:num1/:num2', (req, res) => {
  const valores = [req.params.num1, req.params.num2];
  exigir(valores.every((valor) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(valor)), 'Informe dois números válidos. Use ponto para decimais.');
  const [num1, num2] = valores.map(Number);
  exigir(Number.isFinite(num1) && Number.isFinite(num2) && Number.isFinite(num1 + num2), 'Os números e a soma devem ser finitos.');
  res.json({ num1, num2, resultado: num1 + num2 });
});
