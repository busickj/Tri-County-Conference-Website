// Loads a public/js/*.js file (written as plain browser globals, no module
// system) into a vm sandbox and returns that sandbox so tests can call its
// top-level functions directly against the real shipped file.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadScript(relativePath, extraGlobals = {}) {
  const filePath = path.join(__dirname, "..", "..", "public", relativePath);
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = Object.assign({ console }, extraGlobals);
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return sandbox;
}

module.exports = { loadScript };
