# Triagem do audit

Fonte: `reports/dependency-audit.json`, atualizado no terminal do proprietário após as correções. O total caiu de 17 entradas (cinco altas) para **nove moderadas, zero altas e zero críticas**. As entradas restantes são efeitos da vulnerabilidade de minimatch em Stryker e typescript-eslint. Todas apontam para nós `dev: true` em `package-lock.json`; nenhum pacote de produção foi apontado. O site publicado serve arquivos estáticos, sem o servidor Vite nem as ferramentas de testes.

| Dependência | Situação | Próxima correção |
| --- | --- | --- |
| Vite | Atualizado para 7.3.7 | Sem entrada no novo audit |
| dependency-cruiser | Atualizado para 17.4.3 | Sem entrada no novo audit |
| brace-expansion, js-yaml, source-map-js | Atualizados transitivamente sem `--force` | Sem entradas no novo audit |
| qs / typed-rest-client | Atualizados transitivamente sem `--force` | Sem entradas no novo audit |
| minimatch / Stryker / typescript-eslint | Amplificação de padrões glob; correção indicada em minimatch 11.0.1 | Dependentes atuais exigem versão 10. Não impor override de versão principal sem validar compatibilidade; acompanhar atualização dos dependentes |

Referências primárias: [Vite/launch-editor](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [picomatch](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

As atualizações compatíveis foram instaladas e produziram um novo lockfile. Todos os checks locais passaram com essas alterações, incluindo E2E e mutação. Os relatórios registram `dirty: true`, pois a atualização do manifesto e do lockfile ainda não estava commitada durante a execução; a CI remota deve verificar o SHA final antes de integrar. O audit não está limpo: as nove entradas moderadas de minimatch permanecem. `npm audit fix --force` não é apropriado: o relatório também propõe downgrade do typescript-eslint e não oferece uma correção compatível para minimatch.

Os globs de lint/teste são definidos pelo projeto. Evite usar essas ferramentas com padrões ou projetos não confiáveis enquanto a atualização do minimatch estiver pendente. Essa avaliação reduz a exposição observada, mas não equivale a uma correção da dependência.
