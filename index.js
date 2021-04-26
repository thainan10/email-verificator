const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const router = express.Router();
const emailValidator = require("deep-email-validator");
const validator = require("./lib/validators");

const PORT = 3000;

const validateEmail = async (email) => emailValidator.validate(email);

router.post("/register", async (request, response, next) => {
  const { email } = request.body;

  if (!email) return response.status(400).send({ message: "Email is missing" });

  const { valid, reason, validators } = await validateEmail(email);

  response.status(200).send({
    valid,
    reason,
    validators,
  });
});

router.post("/register-manual", async (request, response, next) => {
  const { email } = request.body;

  if (!email) return response.status(400).send({ message: "Email is missing" });

  const [name, domain] = email.split("@");
  const { exchange } = await validator.getBestMx(domain);

  const smtpResult = await validator.verifyEmailExistence(
    "name@example.org",
    email,
    exchange
  );

  response.status(200).send({
    name,
    domain,
    exchange,
    smtpResult,
  });
});

app.use(bodyParser.json());
app.use(router);

app.listen(process.env.PORT || PORT, () => {
  console.log(`Service running on port ${PORT}`);
});
