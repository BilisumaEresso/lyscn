const { validationResult } = require('express-validator');

/**
 * Middleware that inspects express-validator results.
 * Returns 400 with structured errors if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(400).json({
      success: false,
      message: errorList.map((e) => e.msg).join('. '),
      errors: errorList,
    });
  }
  return next();
};

module.exports = { validate };
