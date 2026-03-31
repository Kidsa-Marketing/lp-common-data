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

  var formConfig = (window.__LP_CONFIG) || {};
  var product    = formConfig.params.product  || '14';
  var campaign   = formConfig.params.campaign || 'kidsa-indicacao';
  var customParams = formConfig.customParams || {};


  // Textos padrão dos botões de submit usados nas LPs.
  // Para sobrescrever em uma LP específica, defina window.__LP_CONFIG.formConfig.buttonTexts.
  var buttonTexts = formConfig.buttonTexts || [
    'QUERO FINALIZAR A INSCRIÇÃO!',
    'Iniciar Agora ➤'
  ];

  // ─── Campos do formulário ───────────────────────────────────────────────────
  var mobilePhone  = document.querySelector(formConfig.formFields.ffMobilePhone);
  var nameField    = document.querySelector(formConfig.formFields.ffNameField);
  var emailField   = document.querySelector(formConfig.formFields.ffEmailField);
  if (formConfig.formFields.ffChildField){
    var childField   = document.querySelector(formConfig.formFields.ffChildField);
  }
  if (formConfig.formFields.ffBirthdayField){
    var birthdayField = document.querySelector(formConfig.formFields.ffBirthdayField);
  }

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

    // ─── Parâmetros fixos ───────────────────────────────────────────────────
    var url = 'https://futuro.kidsa.com/?layout=course'
      + '&email='    + encodeURIComponent(emailField   ? emailField.value.trim()  : '')
      + '&name='     + encodeURIComponent(nameField    ? nameField.value.trim()   : '')
      + '&phone='    + encodeURIComponent(mobilePhone.value.trim())
      + '&campaign=' + encodeURIComponent(campaign)
      + '&product='  + encodeURIComponent(product);

    // ─── Parâmetros opcionais via fields ────────────────────────────────────
    if (childField) {
      url += '&child=' + encodeURIComponent(childField.value.trim());
    }

    if (birthdayField) {
      url += '&birthday=' + encodeURIComponent(birthdayField.value.trim());
    }

    if (urlParams.has('from')) {
      url +=  '&from=' + encodeURIComponent(normalize(urlParams.get('from')));
    }

    if (urlParams.has('ref')) {
      url += '&ref=' + encodeURIComponent(normalize(urlParams.get('ref')));
    }

    if (urlParams.has('utm_source')) {
      url += '&utm_source=' + encodeURIComponent(normalize(urlParams.get('utm_source')));
    }

    if (urlParams.has('utm_medium')) {
      url += '&utm_medium=' + encodeURIComponent(normalize(urlParams.get('utm_medium')));
    }

    if (urlParams.has('utm_campaign')) {
      url += '&utm_campaign=' + encodeURIComponent(normalize(urlParams.get('utm_campaign')));
    }

    if (urlParams.has('utm_content')) {
      url += '&utm_content=' + encodeURIComponent(normalize(urlParams.get('utm_content')));
    }

    if (urlParams.has('utm_term')) {
      url += '&utm_term=' + encodeURIComponent(normalize(urlParams.get('utm_term')));
    }

    // ─── Parâmetros customizados ─────────────────────────────────────────────
    Object.keys(customParams).forEach(function (key) {
      url += '&' + key + '=' + encodeURIComponent(customParams[key]);
    });


    window.location.href = url;
  });

  Object.defineProperty(submitButton, 'myListenerAdded', { value: true, writable: false });
});
