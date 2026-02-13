const express = require('express')
const router = express.Router()
const characteristicController = require('../controllers/characteristic.controller')
const { authenticate } = require('../middlewares/auth.middleware')

router.get('/', characteristicController.getAll)
router.get('/:id', characteristicController.getById)
router.post('/', authenticate, characteristicController.create)
router.put('/:id', authenticate, characteristicController.update)
router.delete('/:id', authenticate, characteristicController.remove)

module.exports = router
