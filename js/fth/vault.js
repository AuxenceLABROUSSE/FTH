/* FTH vault: the confidentiality layer of the reporting platform (WebCrypto only, no library).

   The site is static and makes no request with client data. Confidentiality and the split of
   access between client and FTH rest on cryptography, not on a server:

   1. Client -> FTH  (.fthpkg)  sealed to the FTH public key: ECDH P-384 with a one-time key,
      HKDF-SHA-256, AES-256-GCM. Only the holder of the FTH private key can open it; the client
      can e-mail it or put it on any file share without exposing the trial balance.
   2. Working file (.fthwork)   the specialist's engagement, sealed to the same FTH key: a lost
      laptop or a forwarded attachment reveals nothing.
   3. FTH -> client  (.fthres)  results released by FTH: signed with the FTH signing key (ECDSA
      P-256, SHA-256) then encrypted with a passphrase (PBKDF2-SHA-256, 600 000 iterations,
      AES-256-GCM). The client sees only what FTH released, and the page proves it comes from
      FTH unaltered. The passphrase travels by another channel (phone, messenger).
   4. Key file (.fthkey)        the two FTH private keys, encrypted with the specialist's
      passphrase. Never on the web server. Public keys: data/fth-keys.js.

   Every envelope is JSON: {format, v, alg, ..., iv, ct}; associated data binds the header to
   the ciphertext, so changing the kind or key id of a file makes it unreadable. */
(function (root) {
  'use strict';
  var subtle = (root.crypto || globalThis.crypto).subtle;
  var te = new TextEncoder(), td = new TextDecoder();
  var PBKDF2_ITER = 600000;

  function b64(buf) {
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(s) { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function rand(n) { var b = new Uint8Array(n); (root.crypto || globalThis.crypto).getRandomValues(b); return b; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

  function sha256(data) { return subtle.digest('SHA-256', typeof data === 'string' ? te.encode(data) : data).then(hex); }
  function pubJwk(j) { return { kty: j.kty, crv: j.crv, x: j.x, y: j.y }; }
  function fingerprint(encJwk, sigJwk) {
    return sha256([encJwk.crv, encJwk.x, encJwk.y, sigJwk.crv, sigJwk.x, sigJwk.y].join('|')).then(function (h) { return h.slice(0, 16).toUpperCase().replace(/(.{4})(?!$)/g, '$1-'); });
  }
  function aad(obj) { return te.encode(JSON.stringify(obj)); }

  function passKey(pass, salt, usage) {
    return subtle.importKey('raw', te.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, usage);
    });
  }

  /* ---------- key set ---------- */

  function generateKeySet(passphrase) {
    if (!passphrase || String(passphrase).length < 12) return Promise.reject(new Error('weakPassphrase'));
    var enc, sig;
    return Promise.all([
      subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveBits']),
      subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    ]).then(function (k) {
      return Promise.all([subtle.exportKey('jwk', k[0].privateKey), subtle.exportKey('jwk', k[1].privateKey)]);
    }).then(function (j) {
      enc = j[0]; sig = j[1];
      return fingerprint(pubJwk(enc), pubJwk(sig));
    }).then(function (keyId) {
      var createdAt = new Date().toISOString();
      var secret = { encPriv: enc, sigPriv: sig, keyId: keyId, createdAt: createdAt };
      var salt = rand(16), iv = rand(12), header = { format: 'fth-keyfile', v: 1, keyId: keyId };
      return passKey(passphrase, salt, ['encrypt']).then(function (k) {
        return subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad(header) }, k, te.encode(JSON.stringify(secret)));
      }).then(function (ct) {
        return {
          keyFile: { format: 'fth-keyfile', v: 1, keyId: keyId, createdAt: createdAt, kdf: 'PBKDF2-SHA256', iter: PBKDF2_ITER, alg: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), ct: b64(ct) },
          publicKeys: { keyId: keyId, createdAt: createdAt, enc: pubJwk(enc), sig: pubJwk(sig) }
        };
      });
    });
  }

  /* Returns {keyId, encPriv, sigPriv, publicKeys}: private keys imported non-extractable. */
  function unlockKeyFile(file, passphrase) {
    if (!file || file.format !== 'fth-keyfile' || file.v !== 1) return Promise.reject(new Error('notKeyFile'));
    var header = { format: 'fth-keyfile', v: 1, keyId: file.keyId };
    return passKey(passphrase, unb64(file.salt), ['decrypt']).then(function (k) {
      return subtle.decrypt({ name: 'AES-GCM', iv: unb64(file.iv), additionalData: aad(header) }, k, unb64(file.ct));
    }).catch(function () { throw new Error('badPassphrase'); }).then(function (pt) {
      var s = JSON.parse(td.decode(pt));
      return Promise.all([
        subtle.importKey('jwk', s.encPriv, { name: 'ECDH', namedCurve: 'P-384' }, false, ['deriveBits']),
        subtle.importKey('jwk', s.sigPriv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
      ]).then(function (keys) {
        return { keyId: s.keyId, createdAt: s.createdAt, encPriv: keys[0], sigPriv: keys[1], publicKeys: { keyId: s.keyId, createdAt: s.createdAt, enc: pubJwk(s.encPriv), sig: pubJwk(s.sigPriv) } };
      });
    });
  }

  /* ---------- sealed to FTH (client package, working file) ---------- */

  function hkdfKey(shared, salt, info, usage) {
    return subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']).then(function (k) {
      return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: salt, info: te.encode(info) }, k, { name: 'AES-GCM', length: 256 }, false, usage);
    });
  }

  /* kind: 'client-package' | 'working-file'. meta: small, non-sensitive header (shown before opening). */
  function sealForFTH(payload, fthPublic, kind, meta) {
    var eph, salt = rand(16), iv = rand(12);
    var header = { format: 'fth-sealed', v: 1, kind: kind, keyId: fthPublic.keyId };
    return subtle.importKey('jwk', fthPublic.enc, { name: 'ECDH', namedCurve: 'P-384' }, false, []).then(function (pub) {
      return subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveBits']).then(function (k) {
        eph = k;
        return subtle.deriveBits({ name: 'ECDH', public: pub }, k.privateKey, 384);
      });
    }).then(function (shared) {
      return hkdfKey(shared, salt, 'FTH ' + kind + ' v1', ['encrypt']);
    }).then(function (key) {
      return Promise.all([subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad(header) }, key, te.encode(JSON.stringify(payload))), subtle.exportKey('jwk', eph.publicKey)]);
    }).then(function (r) {
      return { format: 'fth-sealed', v: 1, kind: kind, keyId: fthPublic.keyId, alg: 'ECDH-P384+HKDF-SHA256+AES-256-GCM', meta: meta || {}, epk: pubJwk(r[1]), salt: b64(salt), iv: b64(iv), ct: b64(r[0]) };
    });
  }

  function openForFTH(env, keys, expectKind) {
    if (!env || env.format !== 'fth-sealed' || env.v !== 1) return Promise.reject(new Error('notSealed'));
    if (expectKind && env.kind !== expectKind) return Promise.reject(new Error('wrongKind'));
    if (env.keyId !== keys.keyId) return Promise.reject(new Error('otherKey'));
    var header = { format: 'fth-sealed', v: 1, kind: env.kind, keyId: env.keyId };
    return subtle.importKey('jwk', env.epk, { name: 'ECDH', namedCurve: 'P-384' }, false, []).then(function (epk) {
      return subtle.deriveBits({ name: 'ECDH', public: epk }, keys.encPriv, 384);
    }).then(function (shared) {
      return hkdfKey(shared, unb64(env.salt), 'FTH ' + env.kind + ' v1', ['decrypt']);
    }).then(function (key) {
      return subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv), additionalData: aad(header) }, key, unb64(env.ct));
    }).catch(function (e) { throw new Error(e && /^(notSealed|wrongKind|otherKey)$/.test(e.message) ? e.message : 'tampered'); })
      .then(function (pt) { return JSON.parse(td.decode(pt)); });
  }

  /* ---------- released by FTH (signed, passphrase) ---------- */

  function sealRelease(payload, keys, passphrase) {
    if (!passphrase || String(passphrase).length < 10) return Promise.reject(new Error('weakPassphrase'));
    var body = te.encode(JSON.stringify(payload)), salt = rand(16), iv = rand(12);
    var header = { format: 'fth-release', v: 1, keyId: keys.keyId };
    return subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.sigPriv, body).then(function (sig) {
      var inner = te.encode(JSON.stringify({ body: b64(body), sig: b64(sig) }));
      return passKey(passphrase, salt, ['encrypt']).then(function (k) { return subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad(header) }, k, inner); });
    }).then(function (ct) {
      return { format: 'fth-release', v: 1, keyId: keys.keyId, alg: 'ECDSA-P256-SHA256 / PBKDF2-SHA256+AES-256-GCM', iter: PBKDF2_ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
    });
  }

  /* Returns {payload, verified}. verified is false when the signature does not match the FTH
     public key of this site (the file then must not be trusted). */
  function openRelease(env, passphrase, fthPublic) {
    if (!env || env.format !== 'fth-release' || env.v !== 1) return Promise.reject(new Error('notRelease'));
    var header = { format: 'fth-release', v: 1, keyId: env.keyId };
    var inner;
    return passKey(passphrase, unb64(env.salt), ['decrypt']).then(function (k) {
      return subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv), additionalData: aad(header) }, k, unb64(env.ct));
    }).catch(function () { throw new Error('badPassphrase'); }).then(function (pt) {
      inner = JSON.parse(td.decode(pt));
      if (!fthPublic || env.keyId !== fthPublic.keyId) return false;
      return subtle.importKey('jwk', fthPublic.sig, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']).then(function (pub) {
        return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64(inner.sig), unb64(inner.body));
      });
    }).then(function (ok) {
      return { payload: JSON.parse(td.decode(unb64(inner.body))), verified: !!ok };
    });
  }

  /* A readable passphrase for releases: 6 groups of 4 characters without look-alikes (~119 bits). */
  function passphrase() {
    var A = 'abcdefghjkmnpqrstuvwxyz23456789', out = [];
    while (out.length < 24) { var b = rand(32); for (var i = 0; i < b.length && out.length < 24; i++) if (b[i] < 248) out.push(A[b[i] % 31]); }  // 248 = 8 x 31: no modulo bias
    return out.join('').replace(/(.{4})(?!$)/g, '$1-');
  }

  root.FTHVault = {
    PBKDF2_ITER: PBKDF2_ITER, sha256: sha256, fingerprint: fingerprint, passphrase: passphrase,
    generateKeySet: generateKeySet, unlockKeyFile: unlockKeyFile,
    sealForFTH: sealForFTH, openForFTH: openForFTH, sealRelease: sealRelease, openRelease: openRelease
  };
})(typeof window !== 'undefined' ? window : globalThis);
