/**
 * Configuration Service
 * Exposes configuration get/set. Used by IPC and optionally by other services.
 */
const configRepo = require('../database/config-repository');

function getAll() {
  return configRepo.getAll();
}

function get(key) {
  return configRepo.get(key);
}

function set(key, value) {
  return configRepo.set(key, value);
}

module.exports = { getAll, get, set };
