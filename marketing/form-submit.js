/**
 * form-submit.js — Captura de formulário e redirecionamento para futuro.kidsa.com
 *
 * Depende de phone-validation.js (deve ser carregado antes).
 *
 * Configuração por LP via window.__LP_CONFIG.form (opcional):
 *   window.__LP_CONFIG = {
 *     ...
 *     form: {
 *       product:  '14',              // ID do produto no futuro.kidsa (obrigatório por LP)
 *       campaign: 'kidsa-indicacao'  // slug da campanha (padrão: 'kidsa-indicacao')
 *     }
 *   };
 *
 * Como usar: carregue no BODY da LP, após phone-validation.js.
 */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var formConfig = (window.__LP_CONFIG && window.__LP_CONFIG.form) || {};
  var product    = formConfig.product  || '14';
  var campaign   = formConfig.campaign || 'kidsa-indicacao';

  // Textos padrão dos botões de submit usados nas LPs.
  // Para sobrescrever em uma LP específica, defina window.__LP_CONFIG.form.buttonTexts.
  var buttonTexts = formConfig.buttonTexts || [
    'QUERO FINALIZAR A INSCRIÇÃO!',
    'Iniciar Agora ➤'
  ];

  // ─── Campos do formulário ───────────────────────────────────────────────────
  var mobilePhone  = document.querySelector('[name="cf_whatsapp_com_ddd_do_responsavel"]');
  var nameField    = document.querySelector('[name="name"]');
  var emailField   = document.querySelector('[name="email"]');
  var childField   = document.querySelector('[name="cf_nome_da_crianca"]');
  var birthdayField = document.querySelector('[name="cf_data_de_nascimento_da_crianca"]');

  if (!mobilePhone) return;

  // ─── Configura campo de telefone ───────────────────────────────────────────
  mobilePhone.setAttribute('maxLength', '11');
  mobilePhone.setAttribute('type', 'tel');
  mobilePhone.addEventListener('keyup', window.__applyPhoneMask, false);
  mobilePhone.addEventListener('blur', function (event) {
    var tel = event.target.value.replace(/\D/g, '');
    if (tel.length > 6) {
      event.target.value = tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
    }
  });
  window.__addValidationMessage(mobilePhone);

  // ─── Parâmetros de URL ──────────────────────────────────────────────────────
  var urlParams = new URLSearchParams(window.location.search);
  var normalize = function (p) { return p || 'undefined'; };
  var idAluno   = normalize(urlParams.get('from'));

  // ─── Botão de submit ────────────────────────────────────────────────────────
  var submitButton = null;
  document.querySelectorAll('form button').forEach(function (btn) {
    if (!submitButton && buttonTexts.indexOf(btn.textContent.trim()) !== -1) {
      submitButton = btn;
    }
  });

  if (!submitButton || submitButton.myListenerAdded) return;

  submitButton.addEventListener('click', function (event) {
    event.preventDefault();

    if (!window.__phoneValidation(mobilePhone.value.trim())) {
      var msg = document.querySelector('.validation-message');
      if (msg) msg.style.display = 'initial';
      return;
    }

    window.location.href = 'https://futuro.kidsa.com/?layout=course' +
      '&email='    + encodeURIComponent(emailField   ? emailField.value.trim()   : '') +
      '&name='     + encodeURIComponent(nameField    ? nameField.value.trim()    : '') +
      '&phone='    + encodeURIComponent(mobilePhone.value.trim()) +
      '&child='    + encodeURIComponent(childField   ? childField.value.trim()   : '') +
      '&birthday=' + encodeURIComponent(birthdayField ? birthdayField.value.trim() : '') +
      '&campaign=' + encodeURIComponent(campaign) +
      '&product='  + encodeURIComponent(product) +
      '&from='     + encodeURIComponent(idAluno);
  });

  Object.defineProperty(submitButton, 'myListenerAdded', { value: true, writable: false });
});
