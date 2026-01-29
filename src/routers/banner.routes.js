const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/banner.controller')
const upload = require('../middlewares/upload.middleware')

// CRUD danh mục sản phẩm
router.get('/', bannerController.getAll)
router.get('/:id', bannerController.getById)
router.post('/', upload.single('image'), bannerController.create)
router.put('/:id', upload.single('image'), bannerController.update)
router.delete('/:id', bannerController.remove)

module.exports = router
