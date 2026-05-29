# Le Bordeu — Shopify Theme (starter)

Tema base para a loja Le Bordeu com estética premium: cores, secções e interacções.

Instalação rápida:

1. Faça upload dos ficheiros do tema para a sua loja Shopify (Theme Kit, CLI, ou pelo painel).
2. No admin, personalize as secções `Hero`, `Collections`, `Featured products`, `Editorial` e `Newsletter`.
3. Substitua imagens em `/images/...` por fotografias reais (hero, collections, products).
4. Configure a coleção `frontpage` com os produtos em destaque.

Notas de personalização:
- Cores principais configuráveis em `config/settings_schema.json`.
- Para adicionar efeitos extra (carrossel avançado, zoom de imagens), integrar bibliotecas leves (Glide, Splide).

## Pacote pronto para upload

O ficheiro ZIP final do tema foi criado em: `C:\Users\Utilizador\OneDrive\Ambiente de Trabalho\le-bordeu-shopify-theme-final.zip`.

### Upload via Shopify CLI
Instale a Shopify CLI e, no terminal, execute:

```bash
shopify theme push --path ./Le-Bordeu --theme "Nome do Tema" 
# ou para desenvolvimento local
shopify theme serve --path ./Le-Bordeu
```

### Upload via painel Shopify
1. Acede a `Online Store > Themes` no admin.
2. Clica em `Upload theme` e escolhe o ficheiro ZIP acima.

### Otimização de imagens
Se quiseres, posso otimizar as imagens (reduzir tamanho sem perda visível) antes do upload. Envia-me os ficheiros de imagens e eu trato disso.

### Bibliotecas incluídas
- `Splide.js` (carrossel responsivo) carregado via CDN para sliders de produtos.
- `medium-zoom` (zoom leve) carregado via CDN para galeria de imagens.


