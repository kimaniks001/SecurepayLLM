(function (global) {
  'use strict';
  // Phase 2: a bounded client for the EXISTING SecurePay guest Agent API.
  // This is not an estate identity or a delegated login. Do not put private estate data in turns.
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TOKEN = /^[A-Za-z0-9_-]{43,256}$/;
  function origin(raw) {
    if (!raw) return '';
    var url = new URL(raw);
    var local = url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(url.hostname);
    var official = url.hostname === 'securepay.ke' || url.hostname.endsWith('.securepay.ke');
    if ((!official && !local) || (url.protocol !== 'https:' && !local) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('SecurePay API must use a verified SecurePay HTTPS origin');
    }
    return url.origin;
  }
  function create(options) {
    options = options || {};
    var siteId = String(options.siteId || '');
    if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(siteId)) throw new Error('Invalid SecurePay site');
    var api = origin(options.apiBaseUrl || '');
    var key = 'securepay.embed.guest.v2:' + siteId;
    var storage = null;
    try { storage = global.sessionStorage || null; } catch (_) { /* private-mode fallback */ }
    var memory = null;
    var record = null;
    var entries = [];
    var pending = null;
    var status = api ? 'unchecked' : 'unconfigured';
    var lastError = '';
    var lastChecked = false;
    function valid(v) {
      return !!v && v.apiOrigin === api && UUID.test(v.conversationId) &&
        TOKEN.test(v.secret) && Number.isFinite(Date.parse(v.anonymousExpiresAt)) &&
        Date.parse(v.anonymousExpiresAt) > Date.now();
    }
    function clear() {
      record = null; memory = null;
      try { storage && storage.removeItem(key); } catch (_) {}
    }
    function restore() {
      var raw = memory;
      if (storage) {
        try { raw = JSON.parse(storage.getItem(key) || 'null'); } catch (_) { raw = null; }
      }
      if (valid(raw)) { record = raw; return; }
      clear();
    }
    function save(v) {
      if (!valid(v)) throw new Error('SecurePay returned an invalid guest conversation');
      record = v; memory = v;
      try { storage && storage.setItem(key, JSON.stringify(v)); } catch (_) {}
    }
    function snapshot() {
      return {status:status, error:lastError, ready:status === 'ready',
        conversationId:record ? record.conversationId : null,
        entries:entries.map(function(e){return {sender:e.sender,text:e.text};}),
        pending:pending ? {message:pending.message} : null};
    }
    function errorMessage(error) {
      if (error && error.code === 429) return 'This assistant is receiving too many requests. Please try later or contact the estate.';
      if (error && error.code === 404) return 'This conversation is no longer available. Start a new conversation.';
      return 'The SecurePay conversation could not be confirmed. Your message was not discarded; retry uses the same request.';
    }
    async function request(path, method, body, withToken, timeout) {
      if (!api) throw new Error('No approved SecurePay API is configured');
      if (typeof global.fetch !== 'function') throw new Error('Browser network API is unavailable');
      var headers = {'Accept':'application/json'};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (withToken && record) headers['X-SecurePay-Conversation-Token'] = record.secret;
      var controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
      var timer = controller && global.setTimeout ? global.setTimeout(function(){controller.abort();}, timeout || 15000) : null;
      try {
        var result = await global.fetch(api + path, {
          method:method, mode:'cors', credentials:'omit', redirect:'error', cache:'no-store',
          headers:headers, body:body === undefined ? undefined : JSON.stringify(body),
          signal:controller ? controller.signal : undefined
        });
        if (!result.ok) {
          var httpError = new Error('SecurePay rejected request');
          httpError.code = result.status;
          throw httpError;
        }
        return await result.json();
      } finally {
        if (timer && global.clearTimeout) global.clearTimeout(timer);
      }
    }
    async function connect() {
      if (!api) return snapshot();
      status = 'checking'; lastError = '';
      try {
        var manifest = await request('/api/v1/public/embed/installations/' + encodeURIComponent(siteId), 'GET');
        if (!manifest || manifest.schemaVersion !== 'securepay-embed-guest-v2' ||
            manifest.siteId !== siteId || manifest.guestChatAvailable !== true ||
            !manifest.enabledOperations || manifest.enabledOperations.ask !== true ||
            manifest.authenticatedOperationsAvailable !== false) {
          status = 'disabled';
          lastError = 'The SecurePay staging backend has not approved guest chat for this website.';
          return snapshot();
        }
        lastChecked = true;
        status = 'ready';
        restore();
        if (record) await history();
        return snapshot();
      } catch (error) {
        status = 'unavailable';
        lastError = 'Cannot reach the approved SecurePay staging service. This widget will not simulate an AI reply.';
        return snapshot();
      }
    }
    async function history() {
      if (!record || status !== 'ready') return snapshot();
      try {
        var result = await request('/api/agent/conversations/' + record.conversationId + '/history?limit=20','GET',undefined,true,15000);
        if (!result || !Array.isArray(result.entries)) throw new Error('Invalid history');
        entries = result.entries.filter(function(e){return e && (e.sender === 'HUMAN' || e.sender === 'KS001') && typeof e.text === 'string';})
          .slice(-40).map(function(e){return {sender:e.sender,text:e.text.slice(0,2000)};});
        return snapshot();
      } catch (error) {
        if (error.code === 404) { clear(); entries=[]; pending=null; }
        lastError = errorMessage(error);
        return snapshot();
      }
    }
    async function ensureConversation() {
      if (record) return;
      var created = await request('/api/agent/conversations','POST',{},false,15000);
      if (!created || !created.conversationId) throw new Error('SecurePay did not create a conversation');
      save({
        apiOrigin:api,
        conversationId:created.conversationId,
        secret:created.conversationAccessSecret,
        anonymousExpiresAt:created.anonymousExpiresAt
      });
    }
    async function attempt() {
      if (!pending || status !== 'ready') return snapshot();
      try {
        await ensureConversation();
        var answer = await request('/api/agent/conversations/' + record.conversationId + '/turns',
          'POST', {message:pending.message,clientTurnId:pending.clientTurnId,
            clientTimeZone:pending.timeZone}, true, 45000);
        if (!answer || typeof answer.message !== 'string') throw new Error('SecurePay returned an invalid response');
        entries.push({sender:'HUMAN',text:pending.message});
        entries.push({sender:'KS001',text:answer.message.slice(0,4000)});
        entries = entries.slice(-40);
        pending = null; lastError = '';
        return snapshot();
      } catch (error) {
        if (error.code === 404) { clear(); pending=null; entries=[]; }
        lastError = errorMessage(error);
        return snapshot();
      }
    }
    async function send(message, timeZone) {
      if (status !== 'ready' || !lastChecked) throw new Error('The SecurePay pilot is not ready');
      if (pending) throw new Error('A previous message needs to be retried first');
      var text = String(message || '').trim();
      if (!text || text.length > 1200) throw new Error('Please enter a message of 1 to 1200 characters');
      if (!global.crypto || typeof global.crypto.randomUUID !== 'function') throw new Error('Secure random IDs unavailable');
      var tz = typeof timeZone === 'string' && timeZone.length <= 64 ? timeZone : undefined;
      pending = {message:text,clientTurnId:global.crypto.randomUUID(),timeZone:tz};
      return attempt();
    }
    return Object.freeze({
      snapshot:snapshot, connect:connect, history:history, send:send,
      retry:function(){return attempt();},
      reset:function(){clear();entries=[];pending=null;lastError='';return snapshot();}
    });
  }
  global.SecurePayGuestAgent = Object.freeze({version:'0.2.0',create:create});
})(window);
