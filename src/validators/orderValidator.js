import Joi from 'joi';

export const orderNumberSchema = Joi.string()
  .pattern(/^ORD-(?:[0-9A-F]{16}|\d{6}-\d{4})$/)
  .required();

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).max(20).required(),
        variant: Joi.string().trim().max(80).allow('').default('Default'),
      }).required()
    )
    .min(1)
    .max(50)
    .required(),
  shipping_address: Joi.string().trim().max(1000).allow('').default(''),
}).required();

export const orderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'shipped', 'in_transit', 'delivered')
    .required(),
  notes: Joi.string().trim().max(500).allow('').default(''),
}).required();
