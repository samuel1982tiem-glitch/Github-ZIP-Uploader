# Github ZIP Uploader

Aplicação front-end (React + Vite + TypeScript) para validar caminhos e enviar arquivos ZIP para um repositório GitHub.

**Principais funcionalidades**
- Validação de caminhos dentro do ZIP antes do envio (dry-run).
- Pré-visualização da árvore de arquivos do ZIP.
- Upload para GitHub usando um token pessoal.
- Feedback de progresso e telas de sucesso/erro.

**Tecnologias**
- Vite
- React + TypeScript

## Começando

Pré-requisitos:
- Node.js 18+ ou compatível
- Um token pessoal do GitHub com permissões para criar/atualizar repositórios ou conteúdos (dependendo do fluxo de uso).

Instalação:

```bash
npm install
```

Executar em desenvolvimento:

```bash
npm run dev
```

Gerar build de produção:

```bash
npm run build
npm run preview
```

## Configuração do token do GitHub

O aplicativo inclui um componente para inserir o token (TokenInputBox). Insira um token pessoal no campo apropriado antes de tentar enviar o ZIP. Para reduzir riscos, crie um token com escopos mínimos necessários para a operação que você pretende (por exemplo `repo` para operações em repositórios privados ou `public_repo` para públicos).

Nunca compartilhe seu token em repositórios públicos.

## Uso

1. Abra a interface no navegador (`http://localhost:5173` por padrão).
2. Insira seu token do GitHub no campo de token.
3. Selecione ou arraste um arquivo ZIP para a aplicação.
4. Use a opção de "Dry Run" para validar caminhos e visualizar a árvore de arquivos.
5. Confirme e realize o upload. A interface exibirá progresso e resultado.

## Estrutura relevante do projeto

- `src/` — código-fonte React
- `src/lib/github.ts` — funções relacionadas à API do GitHub
- `src/lib/zip.ts` — utilitários para leitura e processamento de ZIP
- `src/components/` — componentes de UI: modais, validação, progresso, etc.

## Contribuindo

Contribuições são bem-vindas. Abra issues para bugs ou sugestões e envie pull requests com pequenas alterações e descrições claras.

## Licença

Este repositório não especifica uma licença por padrão. Adicione um arquivo `LICENSE` se quiser publicar com uma licença específica.

---

Se quiser, eu posso também adicionar um exemplo de fluxo de uso, screenshots ou um arquivo `env` com variáveis de exemplo.
