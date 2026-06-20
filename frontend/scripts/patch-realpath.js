const fs = require('fs');

function patchPath(res) {
  if (typeof res === 'string') {
    res = res.replace(/^[Ff]:\\Constitution and LAw/i, 'Z:');
    res = res.replace(/^[Ff]:\/Constitution and LAw/i, 'Z:');
    res = res.replace(/^[Ff]:\\\\Constitution and LAw/i, 'Z:');
  }
  return res;
}

// Patch fs.realpathSync
const origRealpathSync = fs.realpathSync;
fs.realpathSync = function(path, options) {
  return patchPath(origRealpathSync(path, options));
};

// Patch fs.realpathSync.native
if (origRealpathSync.native) {
  const origNative = origRealpathSync.native;
  fs.realpathSync.native = function(path, options) {
    return patchPath(origNative(path, options));
  };
}

// Patch fs.realpath
const origRealpath = fs.realpath;
fs.realpath = function(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  return origRealpath(path, options, (err, resolvedPath) => {
    if (callback) {
      callback(err, patchPath(resolvedPath));
    }
  });
};

if (origRealpath.native) {
  const origNativeRealpath = origRealpath.native;
  fs.realpath.native = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    return origNativeRealpath(path, options, (err, resolvedPath) => {
      if (callback) {
        callback(err, patchPath(resolvedPath));
      }
    });
  };
}

// Patch fs.promises.realpath
if (fs.promises && fs.promises.realpath) {
  const origRealpathPromise = fs.promises.realpath;
  fs.promises.realpath = async function(path, options) {
    const res = await origRealpathPromise(path, options);
    return patchPath(res);
  };
}
