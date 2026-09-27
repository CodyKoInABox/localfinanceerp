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

Nada sai do navegador, exceto o JSON que você exporta.

## Exportar / importar

**Configurações → Dados**

- **Exportar JSON** — `schemaVersion`, `exportedAt`, configurações, bancos, pessoas, tipos, contas a pagar, contas a receber, investimentos e histórico de valor.
- **Mesclar arquivo** — upsert por `id`.
- **Substituir tudo** — apaga a base deste navegador e carrega o arquivo.
- **Apagar tudo** — base vazia, tipos padrão e BRL.

Exporte antes de trocar de máquina ou limpar os dados do site.

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
