const bannerModel = require('../models/banner.model')

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '' } = req.query
    const result = await bannerModel.getAllBanner({ page, limit, type })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

const getById = async (req, res) => {
  const data = await bannerModel.getBannerById(req.params.id)
  if (!data) return res.status(404).json({ message: 'Not found' })
  res.json(data)
}

const create = async (req, res) => {
  try {
    const { name, type } = req.body
    const image = req.file ? `/uploads/${req.file.filename}` : null

    const newCategory = await bannerModel.createBanner({
      name,
      type,
      image
    })
    res.status(201).json(newCategory)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const update = async (req, res) => {
  try {
    const { name, type } = req.body
    const image = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.image || null

    const updated = await bannerModel.updateBanner(req.params.id, {
      name,
      type,
      image
    })
    if (!updated) return res.status(404).json({ message: 'Not found' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const remove = async (req, res) => {
  await bannerModel.deleteBanner(req.params.id)
  res.json({ message: 'Category deleted' })
}

module.exports = { getAll, getById, create, update, remove }
