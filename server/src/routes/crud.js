const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roleCheck');

module.exports = (module, c) => {
  const router = express.Router();
  router.use(protect);
  router.get('/', permit(module, 'read'), c.list);
  router.get('/:id', permit(module, 'read'), c.getOne);
  router.post('/', permit(module, 'create'), c.create);
  router.put('/:id', permit(module, 'update'), c.update);
  router.delete('/:id', permit(module, 'delete'), c.remove);
  return router;
};
