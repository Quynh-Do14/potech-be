const db = require('../config/database')

const getAllBLog = async ({
  page = 1,
  limit = 10,
  search = '',
  category_id
}) => {
  const offset = (page - 1) * limit
  const queryParams = []

  let query = `
    SELECT b.*, bc.name AS category_name, u.name AS user_name
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.active = true
  `

  let countQuery = `
    SELECT COUNT(*) 
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.active = true
  `
  let conditions = []

  // Tìm kiếm theo title
  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(b.title) LIKE LOWER($${queryParams.length})`)
  }

  // Lọc theo blog_category_id
  if (category_id) {
    queryParams.push(category_id)
    conditions.push(`b.blog_category_id = $${queryParams.length}`)
  }

  // Gắn điều kiện WHERE nếu có
  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  // Phân trang
  queryParams.push(limit)
  queryParams.push(offset)
  query += ` ORDER BY b.id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  // Truy vấn DB
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

const getAllBLogPrivate = async ({
  page = 1,
  limit = 10,
  search = '',
  category_id,
  active = ''
}) => {
  const offset = (page - 1) * limit
  const queryParams = []

  let query = `
    SELECT b.*, bc.name AS category_name, u.name AS user_name
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
  `

  let countQuery = `
    SELECT COUNT(*) 
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
  `
  let conditions = []

  // Tìm kiếm theo title
  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(b.title) LIKE LOWER($${queryParams.length})`)
  }

  // Lọc theo blog_category_id
  if (category_id) {
    queryParams.push(category_id)
    conditions.push(`b.blog_category_id = $${queryParams.length}`)
  }

  if (active) {
    queryParams.push(active)
    conditions.push(`b.active = $${queryParams.length}`)
  }

  // Gắn điều kiện WHERE nếu có
  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  // Phân trang
  queryParams.push(limit)
  queryParams.push(offset)
  query += ` ORDER BY b.id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  // Truy vấn DB
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

const getBLogById = async id => {
  // Lấy bài viết hiện tại
  const blogResult = await db.query(
    `
    SELECT b.*, bc.name AS category_name, u.name AS user_name
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.id = $1 AND b.active = true
    `,
    [id]
  )

  const blog = blogResult.rows[0]
  if (!blog) return null

  // Lấy các bài viết liên quan trong cùng danh mục, ngoại trừ bài viết hiện tại
  const relatedResult = await db.query(
    `
    SELECT b.id, b.title, b.image , b.created_at
    FROM blog b
    WHERE b.blog_category_id = $1 AND b.id != $2 AND b.active = true
    ORDER BY b.created_at DESC
    LIMIT 5
    `,
    [blog.blog_category_id, id]
  )

  return {
    ...blog,
    related_blogs: relatedResult.rows
  }
}

const getBLogByIdPrivate = async id => {
  // Lấy bài viết hiện tại
  const blogResult = await db.query(
    `
    SELECT b.*, bc.name AS category_name, u.name AS user_name
    FROM blog b
    LEFT JOIN blog_categories bc ON b.blog_category_id = bc.id
    LEFT JOIN users u ON b.user_id = u.id
    WHERE b.id = $1
    `,
    [id]
  )

  const blog = blogResult.rows[0]
  if (!blog) return null

  return blog
}

const createBLog = async ({
  title,
  description,
  short_description,
  blog_category_id,
  active,
  image,
  user_id
}) => {
  const res = await db.query(
    'INSERT INTO blog (title, description, short_description, blog_category_id, active, image, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [
      title,
      description,
      short_description,
      blog_category_id,
      active,
      image,
      user_id
    ]
  )
  return res.rows[0]
}

const updateBLog = async (
  id,
  { title, description, short_description, blog_category_id, active, image }
) => {
  const fields = [
    'title',
    'description',
    'short_description',
    'blog_category_id',
    'active'
  ]
  const values = [
    title,
    description,
    short_description,
    blog_category_id,
    active
  ]
  let query =
    'UPDATE blog SET title = $1, description = $2, short_description =$3, blog_category_id = $4, active = $5'

  if (image !== undefined && image !== null && image !== '') {
    fields.push('image')
    values.push(image)
    query =
      'UPDATE blog SET title = $1, description = $2, short_description =$3, blog_category_id = $4, active = $5, image = $6'
  }

  query += ` WHERE id = $${fields.length + 1} RETURNING *`
  values.push(id)

  const result = await db.query(query, values)
  return result.rows[0]
}

const deleteBLog = async id => {
  await db.query('DELETE FROM blog WHERE id = $1', [id])
}

module.exports = {
  getAllBLog,
  getAllBLogPrivate,
  getBLogById,
  getBLogByIdPrivate,
  createBLog,
  updateBLog,
  deleteBLog
}
