const bcrypt = require("bcrypt");

const hashPass = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

const comparePass = (password, hashed) => {
  return bcrypt.compareSync(password, hashed);
};

module.exports = {
  hashPass,
  comparePass,
};
