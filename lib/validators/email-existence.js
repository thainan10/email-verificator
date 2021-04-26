const net = require("net");
const { ErrorCodes, hasCode } = require("../../constants/smtp-error-codes");

const counter = (from) => {
  let accumulated = from - 1;

  return () => {
    accumulated++;

    return accumulated;
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

  connection.on("success", () => {
    if (connection.writable && !connection.destroyed) {
      connection.write(`quit\r\n`);
      connection.end();
      connection.destroy();
    }
    resolve({ valid: true });
  });

  connection.on("timeout", () => {
    connection.emit("fail", "Timeout");
  });

  const count = counter(0);

  connection.on("next", () => {
    if (count() < 3) {
      if (connection.writable) {
        connection.write(commands[i++]);
      } else {
        connection.emit("fail", "SMTP communication unexpectedly closed.");
      }
    } else {
      connection.emit("success");
    }
  });

  connection.on("connect", () => {
    connection.on("data", (message) => {
      if (
        hasCode(message, ErrorCodes[220]) ||
        hasCode(message, ErrorCodes[250])
      ) {
        connection.emit("next", message);
      } else if (hasCode(message, ErrorCodes[550])) {
        connection.emit("fail", "Mailbox not found.");
      } else {
        const [code] = Object.typedKeys(ErrorCodes).filter((code) =>
          hasCode(message, code)
        );
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
