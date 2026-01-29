const express = require('express')
const router = express.Router()
const videoController = require('../controllers/video.controller')
const upload = require('../middlewares/upload.middleware')

// CRUD danh mục sản phẩm
router.get('/', videoController.getAll)
router.get('/:id', videoController.getById)
router.post('/', videoController.create)
router.put('/:id', videoController.update)
router.delete('/:id', videoController.remove)

module.exports = router
