var assert = require('assert');

var jsonGpg = require('../');

describe('JSON GPG', function() {
  it('should sign and verify object', function(cb) {
    jsonGpg.sign({ hello: 'world' }, function(err, result) {
      if (err)
        return cb(err);

      jsonGpg.verify({ hello: 'world' }, result, function(err, result) {
        if (err)
          return cb(err);
        assert.ok(result);
        cb();
      });
    });
  });

  it('should sign and but fail to verify incorrect object', function(cb) {
    jsonGpg.sign({ hello: 'world' }, function(err, result) {
      if (err)
        return cb(err);

      jsonGpg.verify({ ohai: 'world' }, result, function(err, result) {
        if (err)
          return cb(err);
        assert.ok(!result);
        cb();
      });
    });
  });
});
