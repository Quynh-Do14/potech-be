const agencyCategoryModel = require('../models/agency-category.model')

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query

    const result = await agencyCategoryModel.getAllCategories({
      page,
      limit,
      search
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error })
  }
}

const getById = async (req, res) => {
  const data = await agencyCategoryModel.getCategoryById(req.params.id)
  if (!data) return res.status(404).json({ message: 'Not found' })
  res.json(data)
}

const create = async (req, res) => {
  try {
    const { name } = req.body

    const newCategory = await agencyCategoryModel.createCategory({ name })
    res.status(201).json(newCategory)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const update = async (req, res) => {
  try {
    const { name } = req.body

    const updated = await agencyCategoryModel.updateCategory(req.params.id, {
      name
    })
    if (!updated) return res.status(404).json({ message: 'Not found' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const remove = async (req, res) => {
  await agencyCategoryModel.deleteCategory(req.params.id)
  res.json({ message: 'Category deleted' })
}

module.exports = { getAll, getById, create, update, remove }
