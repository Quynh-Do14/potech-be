const express = require('express')
const router = express.Router()
const seoProdcutController = require('../controllers/seo-product.controller')
const { authenticate } = require('../middlewares/auth.middleware')

router.get('/', seoProdcutController.getAll)
router.get('/private/:id', authenticate, seoProdcutController.getByIdPrivate)
router.get('/:slug', seoProdcutController.getBySlug)
router.post('/', authenticate, seoProdcutController.create)
router.put('/:id', authenticate, seoProdcutController.update)
router.delete('/:id', authenticate, seoProdcutController.remove)

module.exports = router
