(function (global) {
  'use strict';
  // Phase 4: the existing site-bound guest Agent API and canonical Agreement review.
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
    var route = '/api/v1/public/embed/installations/' + encodeURIComponent(siteId) + '/conversations';
    var key = 'securepay.embed.guest.v3:' + siteId;
    var pendingKey = key + '.pending';
    var reviewKey = key + '.review-action';
    var storage = null;
    try { storage = global.sessionStorage || null; } catch (_) { /* private-mode fallback */ }
    var memory = null;
    var record = null;
    var entries = [];
    var pending = null;
    var formation = null, formationError = '', prepared = null, reviewPending = null;
    var status = api ? 'unchecked' : 'unconfigured';
    var lastError = '';
    var lastChecked = false;
    function valid(v) {
      return !!v && v.apiOrigin === api && UUID.test(v.conversationId) &&
        TOKEN.test(v.secret) && Number.isFinite(Date.parse(v.anonymousExpiresAt)) &&
        Date.parse(v.anonymousExpiresAt) > Date.now();
    }
    function clearReviewPending() {
      reviewPending = null;
      try { storage && storage.removeItem(reviewKey); } catch (_) {}
    }
    function keepReviewPending() {
      try {
        if(storage && record && reviewPending) storage.setItem(reviewKey,JSON.stringify({
          apiOrigin:api,conversationId:record.conversationId,
          anonymousExpiresAt:record.anonymousExpiresAt,
          actionId:reviewPending.actionId,version:reviewPending.version
        }));
      } catch (_) {}
    }
    function restoreReviewPending() {
      if(!record || !storage)return;
      try {
        var saved=JSON.parse(storage.getItem(reviewKey)||'null');
        if(saved && saved.apiOrigin===api && saved.conversationId===record.conversationId &&
           saved.anonymousExpiresAt===record.anonymousExpiresAt && UUID.test(saved.actionId) &&
           Number.isSafeInteger(saved.version) && saved.version>=0) {
          reviewPending={actionId:saved.actionId,version:saved.version};
        } else storage.removeItem(reviewKey);
      } catch (_) {try{storage.removeItem(reviewKey);}catch (_) {}}
    }
    function clearPending() {
      pending = null;
      try { storage && storage.removeItem(pendingKey); } catch (_) {}
    }
    function persistPending() {
      try {
        if(storage && pending && record) storage.setItem(pendingKey,JSON.stringify({
          apiOrigin:api, conversationId:record.conversationId,
          anonymousExpiresAt:record.anonymousExpiresAt,
          message:pending.message, clientTurnId:pending.clientTurnId, timeZone:pending.timeZone
        }));
      } catch (_) { /* Non-persistent browsers retain this in memory only */ }
    }
    function recoverPending() {
      if(!record || !storage) return;
      try {
        var saved=JSON.parse(storage.getItem(pendingKey)||'null');
        if(saved && saved.apiOrigin===api && saved.conversationId===record.conversationId &&
          saved.anonymousExpiresAt===record.anonymousExpiresAt &&
          typeof saved.message==='string' && saved.message.trim() &&
          saved.message.length<=1200 && UUID.test(saved.clientTurnId) &&
          (saved.timeZone===undefined || (typeof saved.timeZone==='string' && saved.timeZone.length<=64))) {
          pending={message:saved.message, clientTurnId:saved.clientTurnId, timeZone:saved.timeZone};
        } else {
          storage.removeItem(pendingKey);
        }
      } catch (_) { try {storage.removeItem(pendingKey);} catch (_) {} }
    }
    function clear() {
      record = null; memory = null; formation = null; prepared = null; formationError = '';
      clearPending(); clearReviewPending();
      try { storage && storage.removeItem(key); } catch (_) {}
    }
    function restore() {
      var raw = memory;
      if (storage) {
        try { raw = JSON.parse(storage.getItem(key) || 'null'); } catch (_) { raw = null; }
      }
      if (valid(raw)) { record = raw; recoverPending(); restoreReviewPending(); return; }
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
        agreement:formation, agreementError:formationError,
        preparedReview:prepared, reviewPending:!!reviewPending,
        pending:pending ? {message:pending.message} : null};
    }
    function errorMessage(error) {
      if (error && error.code === 429) return 'The Store-sponsored KS001 allowance is used. You can still send a normal enquiry to the trader.';
      if (error && error.code === 409) return 'That KS001 request is still processing. Please retry the same message shortly.';
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
        if (!manifest || manifest.schemaVersion !== 'securepay-embed-guest-v3' ||
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
        var result = await request(route + '/' + record.conversationId + '/history?limit=20','GET',undefined,true,15000);
        if (!result || !Array.isArray(result.entries)) throw new Error('Invalid history');
        entries = result.entries.filter(function(e){return e && (e.sender === 'HUMAN' || e.sender === 'KS001') && typeof e.text === 'string';})
          .slice(-40).map(function(e){return {sender:e.sender,text:e.text.slice(0,2000)};});
        lastError = '';
        return snapshot();
      } catch (error) {
        // A valid possession token is not permission to manufacture an empty chat.
        // Fail CLOSED until the server confirms the actual prior conversation.
        // Preserve the original token for transient network/retry errors.
        // The server's explicit 404 is the only invalidation of that record.
        if (error && error.code === 404) {
          // Retain the token until an intentional reset so reload cannot
          // silently manufacture an unrelated "new" conversation.
          status='expired';
        } else {
          status='continuity-unavailable';
        }
        lastError = errorMessage(error);
        return snapshot();
      }
    }
    async function ensureConversation() {
      if (record) return;
      var created = await request(route,'POST',{},false,15000);
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
        persistPending();
        var answer = await request(route + '/' + record.conversationId + '/turns',
          'POST', {message:pending.message,clientTurnId:pending.clientTurnId,
            clientTimeZone:pending.timeZone}, true, 45000);
        if (!answer || typeof answer.message !== 'string') throw new Error('SecurePay returned an invalid response');
        entries.push({sender:'HUMAN',text:pending.message});
        entries.push({sender:'KS001',text:answer.message.slice(0,4000)});
        entries = entries.slice(-40);
        formation=null; prepared=null; formationError=''; clearReviewPending();
        clearPending(); lastError = '';
        return snapshot();
      } catch (error) {
        if (error && error.code === 404) {
          // Do not silently begin a different conversation after an expired one.
          status='expired';
        }
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
      persistPending();
      return attempt();
    }

    /**
     * Read-only, canonical Agreement Formation. Nothing here signs, funds, issues a
     * SecureLink or claims that a counterparty agreed. Same site + possession checks.
     */
    async function reviewAgreement(timeZone) {
      if(status!=='ready'||!record||pending)throw new Error('Complete your current KS001 message first.');
      var query=typeof timeZone==='string' && timeZone.length<=64
        ? '?timeZone='+encodeURIComponent(timeZone) : '';
      try {
        var response=await request(route+'/'+record.conversationId+'/agreement-formation'+query,
          'GET',undefined,true,15000);
        if(!response||response.conversationId!==record.conversationId||
            !Number.isSafeInteger(response.version)||response.version<0||
            typeof response.summary!=='string'||typeof response.stage!=='string'||
            !Array.isArray(response.openPoints))throw new Error('Invalid canonical agreement review');
        formation={
          conversationId:response.conversationId,version:response.version,
          digest:typeof response.digest==='string'?response.digest:'',
          stage:response.stage,reviewable:response.reviewable===true,
          confirmable:response.confirmable===true,
          summary:response.summary.slice(0,2000),
          what:Array.isArray(response.what)?response.what.slice(0,12):[],
          who:Array.isArray(response.who)?response.who.slice(0,12):[],
          money:Array.isArray(response.money)?response.money.slice(0,12):[],
          when:Array.isArray(response.when)?response.when.slice(0,12):[],
          responsibilities:Array.isArray(response.responsibilities)?response.responsibilities.slice(0,10):[],
          conditions:Array.isArray(response.conditions)?response.conditions.slice(0,10):[],
          notIncluded:Array.isArray(response.notIncluded)?response.notIncluded.slice(0,10):[],
          origin:response.origin||null,
          openPoints:response.openPoints.slice(0,30),
          question:response.question||null,
          reviewBlockedReason:typeof response.reviewBlockedReason==='string'?response.reviewBlockedReason:'',
          confirmationBlockedReason:typeof response.confirmationBlockedReason==='string'?response.confirmationBlockedReason:''
        };
        formationError='';
        if(prepared && prepared.tradeContextVersion!==formation.version)prepared=null;
        return snapshot();
      } catch (err) {
        if(err && err.code===404) {clear();entries=[];}
        formationError='Could not load the current Agreement review. Nothing has been signed or sent.';
        return snapshot();
      }
    }
    async function prepareAgreementReview() {
      if(status!=='ready'||!record||pending)throw new Error('Complete your current KS001 message first.');
      if(!formation||!formation.reviewable)throw new Error('KS001 needs more information before Agreement review.');
      if(!global.crypto||typeof global.crypto.randomUUID!=='function')
        throw new Error('Secure random IDs unavailable');
      if(!reviewPending) {
        reviewPending={actionId:global.crypto.randomUUID(),version:formation.version};
        keepReviewPending();
      }
      try {
        var response=await request(route+'/'+record.conversationId+'/agreement-handoff',
          'POST',{clientActionId:reviewPending.actionId,
            expectedTradeContextVersion:reviewPending.version},true,20000);
        if(!response||!UUID.test(response.handoffId)||
            response.conversationId!==record.conversationId||
            response.tradeContextVersion!==reviewPending.version)
          throw new Error('Invalid SecurePay review handoff');
        prepared={
          handoffId:response.handoffId,
          status:String(response.status||'PREPARED'),
          tradeContextVersion:response.tradeContextVersion,
          mustResolve:Array.isArray(response.mustResolve)?response.mustResolve.slice(0,20):[],
          stillToDecide:Array.isArray(response.stillToDecide)?response.stillToDecide.slice(0,20):[],
          expiresAt:response.expiresAt||null
        };
        formationError='';
        clearReviewPending();
        return snapshot();
      } catch (err) {
        if(err && err.code===404) {clear();entries=[];return snapshot();}
        if(err && err.code===409) {
          // The reviewed version may have changed. Do not silently retry a stale review.
          clearReviewPending();formation=null;
          formationError='The agreement changed. Refresh its review before preparing it again.';
        } else {
          formationError='Review preparation was not confirmed. Retry the SAME action; no Agreement or SecureLink has been issued.';
        }
        return snapshot();
      }
    }


    /**
     * Guest proves possession to SecurePay and receives a 5-minute one-use server
     * ticket. Both this ticket and the guest possession token move ONLY through
     * an exact-origin browser postMessage to the SecurePay staging receiver.
     */
    async function createWorkTransfer(context) {
      if(status!=='ready'||!lastChecked||!record||pending)
        throw new Error('Finish or confirm the current KS001 conversation first.');
      context=context&&typeof context==='object'?context:{};
      var ref=typeof context.returnReference==='string'&&
        /^[A-Za-z0-9_-]{3,64}$/.test(context.returnReference)?context.returnReference:null;
      var purpose=['HOME','WORK'].includes(context.purpose)?context.purpose:'UNSPECIFIED';
      var result=await request(route+'/'+record.conversationId+'/transfers','POST',
        {returnReference:ref,purpose:purpose},true,15000);
      if(!result||!(/^[A-Za-z0-9_-]{43}$/.test(result.ticket||'')))
        throw new Error('SecurePay returned an invalid transfer ticket');
      var receiver;
      try { receiver=new URL(result.receiverOrigin); }
      catch (_) { throw new Error('SecurePay receiver is unavailable'); }
      var hostname=receiver.hostname.toLowerCase();
      var approved=hostname.endsWith('.securepay.ke')&&
        /^(?:staging|sandbox|qa|test)\./.test(hostname);
      if(!approved||receiver.protocol!=='https:'||receiver.pathname!=='/'||
        receiver.search||receiver.hash||receiver.username||receiver.password)
        throw new Error('Unapproved SecurePay receiving website');
      if(!Number.isFinite(Date.parse(result.expiresAt))||
         Date.parse(result.expiresAt)<=Date.now())
        throw new Error('SecurePay transfer ticket has expired');
      return {ticket:result.ticket,receiverOrigin:receiver.origin,
        conversationId:record.conversationId,siteId:siteId,
        guestToken:record.secret,expiresAt:result.expiresAt};
    }

    return Object.freeze({
      snapshot:snapshot, connect:connect, history:history, send:send,
      reviewAgreement:reviewAgreement, prepareAgreementReview:prepareAgreementReview,
      createWorkTransfer:createWorkTransfer,
      retry:function(){return attempt();},
      reset:function(){
        clear();entries=[];lastError='';
        // A fresh chat may start only after the person explicitly clears the
        // previous unavailable/expired conversation and the site is approved.
        status=lastChecked?'ready':'unchecked';
        return snapshot();
      }
    });
  }
  global.SecurePayGuestAgent = Object.freeze({version:'0.5.0',create:create});
})(window);
