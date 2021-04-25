const dns = require("dns");
const { resolve } = require("path");
const { domain } = require("process");

const getMx = async (domain) =>
  new Promise((resolve) =>
    dns.resolveMx(domain, (error, addresses) => resolve(error ? [] : addresses))
  );

const getBestMx = async (domain) => {
  const defaultMX = { exchange: "", priority: Number.MAX_SAFE_INTEGER };
  const addresses = await getMx(domain);

  return addresses.reduce(
    (result, address) =>
      address.priority < result.priority ? address : result,
    defaultMX
  );
};

module.exports = {
  getMx,
  getBestMx,
};
