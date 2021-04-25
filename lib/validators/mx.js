const dns = require("dns");
const { resolve } = require("path");

const getMx = async (domain) =>
  new Promise((resolve) =>
    dns.resolveMx(domain, (error, addresses) => resolve(error ? [] : addresses))
  );

module.exports = {
  getMx,
};
