const net = require("net");
const { ErrorCodes, hasCode } = require("../../constants/smtp-error-codes");

const getCounter = (from) => {
  let accumulated = from;
  const increment = () => accumulated++;
  const getCount = () => accumulated;

  return {
    increment,
    getCount,
  };
};

const verifyEmailExistence = async (sender, recipient, exchange) =>
  new Promise((resolve) => {
    checkEmailExistence(sender, recipient, exchange, resolve);
  });

const checkEmailExistence = (sender, recipient, exchange, resolve) => {
  const TIMEOUT = 1000 * 10; // 10 seconds
  const connection = net.createConnection(25, exchange);
  const commands = [
    `helo ${exchange}\r\n`,
    `mail from: <${sender}>\r\n`,
    `rcpt to: <${recipient}>\r\n`,
  ];

  connection.setEncoding("ascii");
  connection.setTimeout(TIMEOUT);

  connection.on("error", (error) => {
    connection.emit("fail", error);
  });

  connection.on("close", (hadError) => {
    connection.emit("fail", "Mail server connection closed");
  });

  connection.on("fail", (message) => {
    resolve({ valid: false, message });
    if (connection.writable && !connection.destroyed) {
      connection.write(`quit\r\n`);
      connection.end();
      connection.destroy();
    }
  });

  connection.on("success", (message) => {
    if (connection.writable && !connection.destroyed) {
      connection.write(`quit\r\n`);
      connection.end();
      connection.destroy();
    }
    resolve({ valid: true, message });
  });

  connection.on("timeout", () => {
    connection.emit("fail", "Timeout");
  });

  const { increment, getCount } = getCounter(0);

  connection.on("next", (message) => {
    if (getCount() < commands.length) {
      if (connection.writable) {
        connection.write(commands[increment()]);
      } else {
        connection.emit("fail", "SMTP communication unexpectedly closed.");
      }
    } else {
      connection.emit("success", message);
    }
  });

  connection.on("connect", () => {
    connection.on("data", (message) => {
      console.log("Data message received:", message);

      const code = Number(
        Object.keys(ErrorCodes).filter((code) => hasCode(message, code))[0]
      );

      if (code === 220 || code === 250) {
        connection.emit("next", ErrorCodes[code]);
      } else if (code === 550) {
        connection.emit("fail", ErrorCodes[code]);
      } else {
        connection.emit(
          "fail",
          ErrorCodes[code] || "Unrecognized SMTP response."
        );
      }
    });
  });
};

module.exports = {
  verifyEmailExistence,
};
