import Joi from 'joi';

/**
 * Validate ESP32 sensor data
 */
export const validateSensorData = (req, res, next) => {
  const schema = Joi.object({
    timestamp: Joi.string().isoDate().required(),
    R_V: Joi.number().min(0).max(300).required(),
    Y_V: Joi.number().min(0).max(300).required(),
    B_V: Joi.number().min(0).max(300).required(),
    R_I: Joi.number().min(0).max(50).required(),
    Y_I: Joi.number().min(0).max(50).required(),
    B_I: Joi.number().min(0).max(50).required(),
    fault: Joi.boolean().required(),
    fault_type: Joi.string().allow(null, '').optional()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ 
      error: 'Invalid data format',
      details: error.details.map(d => d.message)
    });
  }

  req.body = value;
  next();
};

/**
 * Validate login credentials
 */
export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(3).required()
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ 
      error: 'Invalid credentials format',
      details: error.details.map(d => d.message)
    });
  }

  req.body = value;
  next();
};
