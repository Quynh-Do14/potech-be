const { ROLES } = require('../constants')
const blogCategoryModel = require('../models/blog-category.model')
const userModel = require('../models/user.model')

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query

    const result = await blogCategoryModel.getAllCategories({
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
  const category = await blogCategoryModel.getCategoryById(req.params.id)
  if (!category) return res.status(404).json({ message: 'Category not found' })
  res.json(category)
}

const create = async (req, res) => {
  const profile = await userModel.findUserById(req.user.id)
  const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

  if (!allowedRoles.includes(profile.role_name))
    return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

  const { name } = req.body
  const category = await blogCategoryModel.createCategory(name)
  res.status(201).json(category)
}

const update = async (req, res) => {
  const profile = await userModel.findUserById(req.user.id)
  const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

  if (!allowedRoles.includes(profile.role_name))
    return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })
  const { name } = req.body
  const category = await blogCategoryModel.updateCategory(req.params.id, name)
  if (!category) return res.status(404).json({ message: 'Category not found' })
  res.json(category)
}

const remove = async (req, res) => {
  const profile = await userModel.findUserById(req.user.id)
  const allowedRoles = [ROLES.ADMIN, ROLES.SELLER]

  if (!allowedRoles.includes(profile.role_name))
    return res.status(403).json({ message: MESSAGES.UNAUTHORIZED })

  await blogCategoryModel.deleteCategory(req.params.id)
  res.json({ message: 'Category deleted' })
}

module.exports = { getAll, getById, create, update, remove }
