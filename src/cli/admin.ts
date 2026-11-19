import { parseArgs } from 'node:util';
import { ZodError } from 'zod';
import { criarConexao, type Database } from '../prisma/db';
import { loginSchema } from '../modules/usuario/usuario.schema';
import { usuarioService } from '../modules/usuario/usuario.service';

// Atribuição controlada do perfil ADMIN: exige acesso ao servidor e ao banco; não existe rota da API para isso.
// A conta precisa existir e não ter perfil; a senha não é alterada.
let db: Database | undefined;
try {
  const { values } = parseArgs({ options: { email: { type: 'string' } } });
  const { email } = loginSchema.pick({ email: true }).parse({ email: values.email });
  db = criarConexao();
  const usuario = await usuarioService(db).tornarAdmin(email);
  console.log(`Conta #${usuario.id_usuario} (${usuario.email}) com perfil ${usuario.perfil}.`);
} catch (erro) {
  if (erro instanceof ZodError) erro.issues.forEach((issue) => console.error(`${issue.path.join('.')}: ${issue.message}`));
  else console.error(erro instanceof Error ? erro.message : String(erro));
  console.error('Uso: npm run usuario:admin -- --email conta@exemplo.com');
  process.exitCode = 1;
} finally {
  await db?.close();
}
