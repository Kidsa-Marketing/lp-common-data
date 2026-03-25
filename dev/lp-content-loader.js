/**
 * lp-content-loader.js — Script central de substituição de conteúdo
 *
 * Hospedado no GitHub Pages. Carregado dinamicamente pelo script no HEAD de cada LP.
 *
 * Fluxo:
 *  1. Lê window.__LP_CONFIG declarado pela LP (placeholders e fallbackUrl)
 *  2. Chama a API enviando as chaves necessárias
 *  3. Percorre o DOM substituindo os placeholders pelo conteúdo retornado
 *  4. Revela a página (remove html.lp-loading)
 *  5. Em caso de falha ou timeout, redireciona para a URL de fallback
 *
 * Formato esperado da resposta da API (POST /rdStationIntegration/contents):
 *  {
 *    "chave-1": { "type": "text", "content": "Texto simples" },
 *    "chave-2": { "type": "html", "content": "<b>HTML permitido</b>" }
 *  }
 *
 * Requisito da API: habilitar CORS para os domínios do RD Station.
 */

  // var API_URL    = 'https://SERVIDOR/api/contents/batch'; // TODO: atualizar com a URL real
  // var TIMEOUT_MS = 4000; // ms até redirecionar para fallback se a API não responder

  // // ─── MOCK (remover quando o endpoint estiver no ar) ─────────────────────────
  // var USE_MOCK      = true;
  // var MOCK_DATA_URL = 'https://kidsa-marketing.github.io/lp-common-data/dev/lp-data.js';

  // function loadMockData() {
  //   return new Promise(function (resolve, reject) {
  //     if (window.__LP_DATA) { resolve(); return; }
  //     var s    = document.createElement('script');
  //     s.src    = MOCK_DATA_URL;
  //     s.onload = function () { resolve(); };
  //     s.onerror = function () { reject(new Error('Falha ao carregar lp-data.js')); };
  //     (document.head || document.documentElement).appendChild(s);
  //   });
  // }

  // function getMockData(keys) {
  //   var data   = window.__LP_DATA || {};
  //   var result = {};
  //   keys.forEach(function (key) {
  //     var value = data[key];
  //     if (value !== undefined) {
  //       if (key.indexOf('imagem') !== -1) {
  //         result[key] = { type: 'html', content: '<img src="' + value + '" alt="' + key + '">' };
  //       } else if (key.indexOf('titulo') !== -1) {
  //         result[key] = { type: 'html', content: '<strong>' + value + '</strong>' };
  //       } else {
  //         result[key] = { type: 'text', content: value };
  //       }
  //     } else {
  //       result[key] = { type: 'text', content: '[sem dados: ' + key + ']' };
  //     }
  //   });
  //   return result;
  // }

(function () {
  'use strict';

  // ─── Configuração ───────────────────────────────────────────────────────────
  var API_URL    = 'https://api.kidsa.com/landingPages/contents';
  var TIMEOUT_MS = 4000;

  var config       = window.__LP_CONFIG || {};
  var placeholders = config.placeholders || [];
  var fallbackUrl  = config.fallbackUrl  || 'https://kidsa.com';

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
      var placeholder = '[' + key + ']'; 
      var content     = (obj && obj.content != null) ? String(obj.content) : '';
      var isHtml      = obj && obj.type === 'html';
      var isImg       = obj && obj.type === 'img';
      var isVideo     = obj && obj.type === 'video';

      if (isImg) {
        content = '<img src="' + content + '" alt="' + key + '">';
        isHtml  = true;
      }

      if (isVideo) {
        var videoId = content.match(/youtu\.be\/([^?&]+)/) ||
                      content.match(/youtube\.com\/watch\?v=([^&]+)/);
        var embedId = videoId ? videoId[1] : null;
        if (embedId) {
          content = '<iframe src="https://www.youtube.com/embed/' + embedId + '"'
            + ' width="100%" height="100%" frameborder="0"'
            + ' style="display:block;aspect-ratio:16/9;"'
            + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
            + ' allowfullscreen></iframe>';
        }
        isHtml = true;
      }

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
          textNode.nodeValue = textNode.nodeValue.replace(placeholder, content);
        } else {
          var raw    = textNode.nodeValue.replace(placeholder, '\x00');
          var parts  = raw.split('\x00');
          var parent = textNode.parentNode;
          var ref    = textNode.nextSibling;

          if (parts[0]) {
            parent.insertBefore(document.createTextNode(parts[0]), ref);
          }

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

  function run() {
    if (placeholders.length === 0) {
      reveal();
      return;
    }

    var done  = false;

    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      redirectToFallback();
    }, TIMEOUT_MS);

    fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({rd_url: config.rd_url, keys: placeholders.map(function(k) { return k.replace(/[\[\]]/g, ''); }) })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
