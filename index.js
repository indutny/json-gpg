var spawn = require('child_process').spawn;
var prompt = require('prompt');

function stringifySorted(obj) {
  if (typeof obj !== 'object' || obj === null)
    return JSON.stringify(obj);

  return '{' + Object.keys(obj).sort().filter(function(key) {
    return obj[key] !== undefined;
  }).map(function(key) {
    return JSON.stringify(key) + ':' + stringifySorted(obj[key]);
  }).join(',') + '}';
}

function gpgAction(action, key, passphrase, input, cb) {
  var args = [
    action,
    '--no-tty',
    '--armor',
    '--passphrase-fd', '3',
    '--status-fd', 3
  ];
  if (key)
    args.push('-u', key);

  var child = spawn('gpg', args, {
    stdio: [ 'pipe', 'pipe', 'pipe', 'pipe', 'pipe' ]
  });
  child.stdio[3].write(passphrase + '\n');
  child.stdin.end(input);

  var output = '';
  var err = '';
  var status = '';
  child.stdout.on('data', function(chunk) {
    output += chunk;
  });
  child.stderr.on('data', function(chunk) {
    err += chunk;
  });
  child.stdio[3].on('data', function(chunk) {
    status += chunk;
  });
  child.once('close', function(code) {
    var fingerprint = null;
    var match = status.match(
        /(?:SIG_CREATED|VALIDSIG)\s+[^\n]*\s+([^\s\n]+)\n/);
    if (match)
      fingerprint = match[1];
    if (code === 0)
      cb(null, output, fingerprint);
    else
      cb(new Error('gpg call failed:\n' + err), null);
  });
}

function getPassphrase(cb) {
  prompt.start({ message: 'json-gpg' });
  prompt.get({
    properties: {
      passphrase: {
        hidden: true,
        required: true,
        message: 'Passphrase required to sign object with GPG.\n' +
                 'Enter passphrase'
      }
    }
  }, function(err, result) {
    if (err)
      return cb(err);
    cb(null, result.passphrase);
  });
}

exports.sign = function sign(object, key, cb) {
  if (typeof key === 'function') {
    cb = key;
    key = null;
  }
  getPassphrase(function(err, passphrase) {
    if (err)
      return cb(err);
    var input = stringifySorted(object);
    gpgAction('--sign', key, passphrase, input, function(err, res, fp) {
      if (err)
        return cb(err);
      cb(null, {
        signature: res,
        fingerprint: fp
      });
    });
  });
};

exports.verify = function verify(object, res, key, cb) {
  if (typeof key === 'function') {
    cb = key;
    key = null;
  }
  getPassphrase(function(err, passphrase) {
    if (err)
      return cb(err);
    gpgAction('--decrypt',
              key,
              passphrase,
              res.signature,
              function(err, input, fp) {
      if (err)
        return cb(err);
      cb(null, res.fingerprint === fp && input === stringifySorted(object));
    });
  });
};
