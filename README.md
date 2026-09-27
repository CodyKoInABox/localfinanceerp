# Local Finance

ERP financeiro local. IndexedDB neste navegador, sem backend e sem conta.

Criado por [codykoinabox](https://github.com/CodyKoInABox). Código: [github.com/CodyKoInABox/localfinanceerp](https://github.com/CodyKoInABox/localfinanceerp). Licença [GPL-3.0](LICENSE).

## GitHub Pages

1. Push na `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow builda com `BASE_PATH: /<repo>/` e publica o `dist`. As rotas são hash (`https://<user>.github.io/<repo>/#/pagar`). `404.html` é uma cópia do `index.html`.

Preview do build (você roda): `npm run build` e depois `npm run preview`.

## Primeiro uso

```bash
npm ci
npm run dev
```

Abra o app, ou em **Configurações → Carregar exemplo** para um conjunto de demonstração (bancos, fornecedores, clientes, contas, parcelas, aplicações). O tema segue o sistema até você escolher claro ou escuro.

Nada sai do navegador, exceto o JSON ou o CSV que você baixa.

## Exportar / importar JSON

**Configurações → Dados**

- **Exportar JSON** — `schemaVersion`, `exportedAt`, configurações, bancos, pessoas, tipos, contas a pagar, contas a receber, investimentos e histórico de valor.
- **Mesclar arquivo** — upsert por `id`.
- **Substituir tudo** — apaga a base deste navegador e carrega o arquivo.
- **Apagar tudo** — base vazia, tipos padrão e BRL.

Exporte antes de trocar de máquina ou limpar os dados do site. O JSON é a cópia do sistema. Para jogar histórico de planilha, use CSV.

## Importar histórico (CSV)

**Configurações → Importar histórico (CSV).** Escolha o tipo, baixe o modelo e mande o arquivo. Não apaga o que já existe. Separador `;` (modelo), `,` ou tab. UTF-8. Cabeçalho na primeira linha. Colunas extras são ignoradas. Datas: `AAAA-MM-DD` ou `DD/MM/AAAA`. Valores: `2800.00` ou `2.800,00`. Se o separador do arquivo for vírgula, não deixe vírgula solta no valor — use `2800.00` ou aspas.

`sim` / `não` (também `s`, `n`, `1`, `0`). Vazio em pago/recebido significa não. Se a data de pagamento vier preenchida e a coluna pago vazia, conta como pago.

Fornecedor, cliente, banco e tipo que ainda não existem são criados. Nome igual ignora maiúscula e acento (`CEF` = `cef`).

**Reimportar:** preencha `id` com uma chave sua (`pag-2024-001`). A mesma chave atualiza a linha. Sem `id`:

- fornecedor, cliente, banco e aplicação casam pelo nome
- conta a pagar casa por dia + nome + fornecedor + valor + NF + grupo + parcela
- conta a receber casa por dia + nome + cliente + valor + grupo + parcela
- valor de aplicação casa por aplicação + dia

Mudar o valor de uma conta sem `id` cria outra linha. Papel de pessoa soma (não tira cliente se o arquivo só diz fornecedor). Campo vazio em pessoa/banco não apaga dado que já estava.

Cada linha de conta é uma parcela. Não mande o total para o sistema fatiar. Série: as três colunas juntas, ou as três vazias.

| coluna     | uso                                                             |
| ---------- | --------------------------------------------------------------- |
| `grupo`    | mesma chave em todas as parcelas da compra, ex. `notebook-2024` |
| `parcela`  | 1, 2, 3…                                                        |
| `parcelas` | total da série                                                  |

### fornecedores.csv

`id;nome;documento;email;telefone;observacoes`

```csv
id;nome;documento;email;telefone;observacoes
forn-cemig;CEMIG;;;;Energia
```

`clientes.csv` tem as mesmas colunas. Todo mundo entra como cliente.

### pessoas.csv

`id;nome;papel;documento;email;telefone;observacoes`

`papel`: `fornecedor`, `cliente` ou `ambos` (também `fornecedor e cliente`).

```csv
id;nome;papel;documento;email;telefone;observacoes
;Oficina Norte;ambos;;;;
```

### bancos.csv

`id;nome;observacoes`

```csv
id;nome;observacoes
bank-cef;CEF;
```

### contas-a-pagar.csv

`id;dia;nome;fornecedor;valor;nf;tipo;banco;pago;pago_em;observacoes;grupo;parcela;parcelas`

`nome` ou `fornecedor` é obrigatório. `tipo` vazio vira `Outro`. Tipos conhecidos: Boleto, PIX CNPJ, PIX QR Code, PIX chave, TED, Débito automático, Cartão de crédito, Cartão de débito, Dinheiro.

```csv
id;dia;nome;fornecedor;valor;nf;tipo;banco;pago;pago_em;observacoes;grupo;parcela;parcelas
pag-2024-001;2024-03-10;Aluguel;Imobiliária Centro;2800,00;NF-12;PIX CNPJ;CEF;sim;2024-03-10;;aluguel-2024;1;12
pag-2024-002;10/04/2024;Energia;CEMIG;486,90;;Boleto;Santander;não;;;;
```

### contas-a-receber.csv

`id;dia;nome;cliente;valor;tipo;banco;recebido;recebido_em;observacoes;grupo;parcela;parcelas`

`nome` ou `cliente` é obrigatório. `tipo` é a natureza da entrada (Serviço, Venda, Salário…). Vazio vira `Outro`.

```csv
id;dia;nome;cliente;valor;tipo;banco;recebido;recebido_em;observacoes;grupo;parcela;parcelas
rec-2024-001;2024-03-12;Projeto site;Ana Lima;4500,00;Serviço;Nubank;sim;2024-03-12;;;;;
```

### investimentos.csv

`id;nome;tipo;banco;aplicado;desde;valor_atual;observacoes`

`valor_atual` opcional. Se vier, grava um ponto de histórico em `desde`.

```csv
id;nome;tipo;banco;aplicado;desde;valor_atual;observacoes
inv-cdb;CDB liquidez diária;Renda fixa;CEF;10000,00;2024-01-02;10440,00;
```

### valores-aplicacoes.csv

`id;aplicacao;dia;valor;aplicado;tipo;banco;observacoes`

Um saldo por dia. `aplicado`, `tipo` e `banco` só entram se a aplicação ainda não existir.

```csv
id;aplicacao;dia;valor;aplicado;tipo;banco;observacoes
;CDB liquidez diária;2024-06-02;10260,00;;;;
```

Aliases aceitos no cabeçalho: `data`/`vencimento` para dia, `descricao` para nome, `remetente` para cliente, `obs` para observacoes, `nota`/`nota_fiscal` para nf, `codigo`/`chave` para id.

## O que tem

- **Conta a pagar** — dia, fornecedor cadastrado ou nome livre, valor, NF, tipo (boleto, PIX CNPJ, PIX QR Code, …), banco usado, pago / pago em, observações.
- **Conta a receber** — dia, tipo, cliente ou remetente, valor, banco em que entrou, recebido / recebido em, observações.
- **Parcelas** — na criação, informe quantas vezes. O valor é dividido em centavos e as datas andam de mês em mês. Cada parcela se paga ou recebe sozinha. Dá para ver ou apagar a série.
- **Fornecedores e clientes** — a mesma pessoa pode ter os dois papéis.
- **Bancos** — CEF, Santander, o que você cadastrar. O resumo por banco é a soma dos lançamentos, não o saldo real da conta.
- **Investimentos** — valor aplicado e histórico de valor de mercado. O resultado é o último valor menos o aplicado.
- **Início e relatórios** — em aberto, atrasado, caixa do mês, gasto por mês, por fornecedor, entrada por cliente, por tipo, por banco, performance das aplicações. Realizado usa a data de pagamento/recebimento; competência usa o dia do lançamento.

Datas são dias de calendário (`AAAA-MM-DD`), sem deslocar fuso.

## Stack

Vite, React 19, TypeScript, Tailwind 4, shadcn/ui, hash router, Dexie, Zod, lucide, sonner.

## Licença

[GNU General Public License v3.0](LICENSE).
