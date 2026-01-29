const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const upload = require('../middlewares/upload.middleware');

// CRUD danh mục sản phẩm
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', upload.single('image'), categoryController.create);
router.put('/:id', upload.single('image'), categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
