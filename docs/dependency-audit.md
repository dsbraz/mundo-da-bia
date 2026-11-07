# Triagem do audit

Fonte: `reports/dependency-audit.json`, produzido no terminal do proprietário após a instalação. São 17 entradas (12 moderadas, cinco altas), incluindo efeitos transitivos contados separadamente. Todas as entradas apontam para nós `dev: true` em `package-lock.json`. Nenhum pacote de produção foi apontado nesse relatório. O site publicado serve arquivos estáticos; o servidor de desenvolvimento Vite e as ferramentas de testes não fazem parte desse runtime.

| Dependência | Situação | Próxima correção |
| --- | --- | --- |
| Vite 7.3.6 | Falhas no servidor de desenvolvimento/launch-editor | Atualizar para 7.3.7, patch indicado pelo audit |
| dependency-cruiser 17.3.8 | Fixa picomatch vulnerável em 4.0.3 | Atualizar para 17.4.3, atualização compatível indicada pelo audit |
| brace-expansion, js-yaml, source-map-js | DoS em processamento de entradas | Atualizações transitivas compatíveis via `npm audit fix`, sem `--force` |
| qs / typed-rest-client | DoS em processamento de entradas | Audit indica atualização compatível disponível; atualizar a árvore e verificar o resultado |
| minimatch / Stryker / typescript-eslint | Amplificação de padrões glob; correção indicada em minimatch 11.0.1 | Dependentes atuais exigem versão 10. Não impor override de versão principal sem validar compatibilidade; acompanhar atualização dos dependentes |

Referências primárias: [Vite/launch-editor](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [picomatch](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

As atualizações acima estão propostas, não instaladas. O executor continua sem acesso ao npm; não foi fabricado lockfile nem declarado audit limpo. A correção deve gerar novo lockfile e passar por todos os gates antes da integração. `npm audit fix --force` não é apropriado: o relatório também propõe downgrade do typescript-eslint e não oferece uma correção compatível para minimatch.

Os globs de lint/teste são definidos pelo projeto. Evite usar essas ferramentas com padrões ou projetos não confiáveis enquanto a atualização do minimatch estiver pendente. Essa avaliação reduz a exposição observada, mas não equivale a uma correção da dependência.
