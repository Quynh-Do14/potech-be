const db = require('../config/database')

const getAllCategories = async ({ page = 1, limit = 10, search = '' }) => {
  const offset = (page - 1) * limit
  const queryParams = []
  let query = 'SELECT * FROM blog_categories'
  let countQuery = 'SELECT COUNT(*) FROM blog_categories'
  let conditions = []

  // Tìm kiếm theo tên (search)
  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(name) LIKE LOWER($${queryParams.length})`)
  }

  // Gắn điều kiện nếu có
  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  // Thêm phân trang
  queryParams.push(limit)
  queryParams.push(offset)
  query += ` ORDER BY id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  // Truy vấn dữ liệu và tổng số dòng
  const dataResult = await db.query(query, queryParams)
  const countResult = await db.query(
    countQuery,
    queryParams.slice(0, queryParams.length - 2)
  )
  const total = parseInt(countResult.rows[0].count)

  return {
    data: dataResult.rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  }
}

const getCategoryById = async id => {
  const result = await db.query('SELECT * FROM blog_categories WHERE id = $1', [
    id
  ])
  return result.rows[0]
}

const createCategory = async name => {
  const result = await db.query(
    'INSERT INTO blog_categories(name) VALUES($1) RETURNING *',
    [name]
  )
  return result.rows[0]
}

const updateCategory = async (id, name) => {
  const result = await db.query(
    'UPDATE blog_categories SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  )
  return result.rows[0]
}

const deleteCategory = async id => {
  await db.query('DELETE FROM blog_categories WHERE id = $1', [id])
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
}
