const db = require('../config/database')

const getAllBanner = async ({ page = 1, limit = 10, type = '' }) => {
  const offset = (page - 1) * limit
  const conditions = []
  const values = []

  // Xây dựng điều kiện WHERE nếu có lọc theo type
  if (type) {
    values.push(type)
    conditions.push(`type = $${values.length}`)
  }

  // Tạo câu WHERE nếu có điều kiện
  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''

  // Câu truy vấn chính
  const dataQuery = `
    SELECT * FROM banner
    ${whereClause}
    ORDER BY id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `

  // Câu truy vấn đếm tổng số dòng
  const countQuery = `
    SELECT COUNT(*) FROM banner
    ${whereClause}
  `

  // Thêm limit và offset vào values
  values.push(limit)
  values.push(offset)

  // Thực hiện truy vấn
  const dataResult = await db.query(dataQuery, values)
  const countResult = await db.query(
    countQuery,
    values.slice(0, conditions.length)
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

const getBannerById = async id => {
  const result = await db.query('SELECT * FROM banner WHERE id = $1', [id])
  return result.rows[0]
}

const createBanner = async ({ name, image, type }) => {
  const result = await db.query(
    'INSERT INTO banner(name, image, type) VALUES($1, $2, $3) RETURNING *',
    [name, image, type]
  )
  return result.rows[0]
}

const updateBanner = async (id, { name, image, type }) => {
  const fields = ['name', 'type']
  const values = [name, type]
  let query = 'UPDATE banner SET name = $1, type = $2'

  if (image !== undefined && image !== null && image !== '') {
    fields.push('image')
    values.push(image)
    query = 'UPDATE banner SET name = $1, type = $2, image = $3'
  }

  query += ` WHERE id = $${fields.length + 1} RETURNING *`
  values.push(id)

  const result = await db.query(query, values)
  return result.rows[0]
}

const deleteBanner = async id => {
  await db.query('DELETE FROM banner WHERE id = $1', [id])
}

module.exports = {
  getAllBanner,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
}
