/**
 * lp-content-loader.js — Script central de substituição de conteúdo
 *
 * Hospedado no servidor. Carregado dinamicamente pelo lp-loader de cada LP.
 *
 * Fluxo:
 *  1. Lê window.__LP_CONFIG declarado pela LP (placeholders e fallbackUrl)
 *  2. Chama a API enviando as chaves necessárias
 *  3. Percorre o DOM substituindo os placeholders pelo conteúdo retornado
 *  4. Revela a página (remove html.lp-loading)
 *  5. Em caso de falha ou timeout, redireciona para a URL de fallback
 *
 * Formato esperado da resposta da API (POST /api/contents/batch):
 *  {
 *    "chave-1": { "type": "text", "content": "Texto simples" },
 *    "chave-2": { "type": "html", "content": "<b>HTML permitido</b>" }
 *  }
 *
 * Requisito da API: habilitar CORS para os domínios do RD Station.
 */
(function () {
  'use strict';

  // ─── Configuração ───────────────────────────────────────────────────────────
  var API_URL    = 'https://SERVIDOR/api/contents/batch'; // TODO: atualizar com a URL real
  var TIMEOUT_MS = 4000; // ms até redirecionar para fallback se a API não responder

  // ─── MOCK (remover quando o endpoint estiver no ar) ─────────────────────────
  var USE_MOCK = true;

  function getMockData(keys) {
    var result = {};
    keys.forEach(function (key) {
      if (key.indexOf('[imagem]') !== -1) {
        result[key] = { type: 'html', content: '<img src="https://placehold.co/400x200?text=' + key + '" alt="[mock] ' + key + '">' };
      } else if (key.indexOf('[valor]') !== -1) {
        result[key] = { type: 'text', content: 'R$ 99,90/mês [mock: ' + key + ']' };
      } else if (key.indexOf('[titulo]') !== -1) {
        result[key] = { type: 'html', content: '<strong>[mock] Título de teste para <em>' + key + '</em></strong>' };
      } else if (key.indexOf('[descricao]') !== -1) {
        result[key] = { type: 'text', content: '[mock] Descrição de teste para a chave "' + key + '". Aqui vai um texto mais longo para simular um parágrafo real.' };
      } else if (key.indexOf('[texto]') !== -1) {
        result[key] = { type: 'text', content: '[mock] Texto de teste para a chave "' + key + '".' };
      } else {
        result[key] = { type: 'text', content: '[mock: ' + key + ']' };
      }
    });
    return result;
  }
  // ────────────────────────────────────────────────────────────────────────────

  var config       = window.__LP_CONFIG || {};
  var placeholders = config.placeholders || [];
  var fallbackUrl  = config.fallbackUrl  || 'https://www.kidsa.com.br/planos';

  // Remove a classe de loading, revelando a página.
  function reveal() {
    document.documentElement.classList.remove('lp-loading');
  }

  function redirectToFallback() {
    window.location.replace(fallbackUrl);
  }

  /**
   * Percorre o DOM substituindo cada placeholder pelo conteúdo da API.
   *
   * @param {Object} data - Mapa { chave: { type, content } } retornado pela API.
   */
  function applyContents(data) {
    Object.keys(data).forEach(function (key) {
      var obj         = data[key];
      var placeholder = key;
      var content     = (obj && obj.content != null) ? String(obj.content) : '';
      var isHtml      = obj && obj.type === 'html';

      // TreeWalker percorre apenas nós de texto — mais eficiente que querySelectorAll.
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            return node.nodeValue && node.nodeValue.indexOf(placeholder) !== -1
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          }
        },
        false
      );

      var found = [];
      var node;
      while ((node = walker.nextNode())) {
        found.push(node);
      }

      found.forEach(function (textNode) {
        if (!isHtml) {
          // Texto puro: substitui diretamente no nó de texto.
          textNode.nodeValue = textNode.nodeValue.replace(placeholder, content);
        } else {
          // HTML: extrai o texto ao redor do placeholder e injeta o fragmento HTML.
          var raw    = textNode.nodeValue.replace(placeholder, '\x00');
          var parts  = raw.split('\x00'); // [texto-antes, texto-depois]
          var parent = textNode.parentNode;
          var ref    = textNode.nextSibling;

          if (parts[0]) {
            parent.insertBefore(document.createTextNode(parts[0]), ref);
          }

          // Desempacota o HTML sem criar um <span> extra no DOM final.
          var temp = document.createElement('span');
          temp.innerHTML = content;
          while (temp.firstChild) {
            parent.insertBefore(temp.firstChild, ref);
          }

          if (parts[1]) {
            parent.insertBefore(document.createTextNode(parts[1]), ref);
          }

          parent.removeChild(textNode);
        }
      });
    });
  }

  // ─── Fluxo principal ────────────────────────────────────────────────────────

  if (placeholders.length === 0) {
    reveal();
    return;
  }

  // Flag para evitar que timeout e fetch colidam.
  var done  = false;

  var timer = setTimeout(function () {
    if (done) return;
    done = true;
    redirectToFallback();
  }, TIMEOUT_MS);

  var request = USE_MOCK
    ? Promise.resolve(getMockData(placeholders))
    : fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keys: placeholders })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });

  request
    .then(function (data) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      applyContents(data);
      reveal();
    })
    .catch(function (err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      console.error('[lp-content-loader] Falha ao carregar conteúdo:', err);
      redirectToFallback();
    });
})();
