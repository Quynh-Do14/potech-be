const db = require('../config/database')
const AppError = require('../utils/AppError')

const getAllProducts = async ({
  page = 1,
  limit = 10,
  search = '',
  category_id,
  brand_id,
  min_price,
  max_price
}) => {
  const offset = (page - 1) * limit
  const queryParams = []

  // Data query với đầy đủ conditions
  let query = `
    SELECT DISTINCT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brand_product bp ON p.id = bp.product_id
    LEFT JOIN brands b ON bp.brand_id = b.id
  `

  let countQuery = `
    SELECT COUNT(DISTINCT p.id)
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brand_product bp ON p.id = bp.product_id
    LEFT JOIN brands b ON bp.brand_id = b.id
  `

  const conditions = ['p.active = true']

  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(p.name) LIKE LOWER($${queryParams.length})`)
  }

  if (category_id) {
    queryParams.push(category_id)
    conditions.push(`p.category_id = $${queryParams.length}`)
  }

  if (brand_id) {
    queryParams.push(brand_id)
    conditions.push(`bp.brand_id = $${queryParams.length}`)
  }

  if (min_price) {
    queryParams.push(min_price)
    conditions.push(`p.price >= $${queryParams.length}`)
  }

  if (max_price) {
    queryParams.push(max_price)
    conditions.push(`p.price <= $${queryParams.length}`)
  }

  // WHERE clause
  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  // Thêm ORDER BY và pagination
  query += ` ORDER BY p.index ASC`

  // Thêm limit và offset
  queryParams.push(limit)
  queryParams.push(offset)
  query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`

  // Execute queries
  const [result, count] = await Promise.all([
    db.query(query, queryParams),
    db.query(countQuery, queryParams.slice(0, queryParams.length - 2))
  ])

  // Lấy images (vẫn N+1 nhưng fix logic trước)
  for (let product of result.rows) {
    const imgs = await db.query(
      `SELECT image_url FROM product_images WHERE product_id = $1`,
      [product.id]
    )
    product.images = imgs.rows.map(r => r.image_url)
  }

  const total = parseInt(count.rows[0].count)

  return {
    data: result.rows,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  }
}

const getAllProductsPrivate = async ({
  page = 1,
  limit = 10,
  search = '',
  category_id,
  brand_id,
  min_price,
  max_price,
  active
}) => {
  const offset = (page - 1) * limit
  const queryParams = []
  let query = `
    SELECT DISTINCT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brand_product bp ON p.id = bp.product_id
    LEFT JOIN brands b ON bp.brand_id = b.id
  `
  let countQuery = `SELECT COUNT(*) FROM products p`
  const conditions = []

  if (search) {
    queryParams.push(`%${search}%`)
    conditions.push(`LOWER(p.name) LIKE LOWER($${queryParams.length})`)
  }

  if (category_id) {
    queryParams.push(category_id)
    conditions.push(`p.category_id = $${queryParams.length}`)
  }

  if (brand_id) {
    queryParams.push(brand_id)
    conditions.push(`p.brand_id = $${queryParams.length}`)
  }

  if (min_price) {
    queryParams.push(min_price)
    conditions.push(`p.price >= $${queryParams.length}`)
  }

  if (max_price) {
    queryParams.push(max_price)
    conditions.push(`p.price <= $${queryParams.length}`)
  }

  if (active) {
    queryParams.push(active)
    conditions.push(`p.active = $${queryParams.length}`)
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ${conditions.join(' AND ')}`
    query += whereClause
    countQuery += whereClause
  }

  queryParams.push(limit, offset)
  query += ` ORDER BY p.id DESC LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`

  const result = await db.query(query, queryParams)
  const count = await db.query(
    countQuery,
    queryParams.slice(0, queryParams.length - 2)
  )

  for (let product of result.rows) {
    const imgs = await db.query(
      `SELECT image_url FROM product_images WHERE product_id = $1`,
      [product.id]
    )
    product.images = imgs.rows.map(r => r.image_url)
  }

  return {
    data: result.rows,
    total: parseInt(count.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count.rows[0].count / limit)
  }
}

const getProductById = async id => {
  // 1. Truy vấn thông tin sản phẩm chính
  const productRes = await db.query(
    `
    SELECT p.*, c.name AS category_name, b.name AS brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.slug = $1 AND p.active = true
    `,
    [id]
  )

  const product = productRes.rows[0]
  if (!product) return null

  // 2. Lấy ảnh sản phẩm
  const imageRes = await db.query(
    `SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY id ASC`,
    [product.id]
  )
  product.images = imageRes.rows.map(r => r.image_url)

  // 3. Lấy danh sách thông số kỹ thuật (figures)
  const figureRes = await db.query(
    `SELECT id, key, value FROM product_figures WHERE product_id = $1 ORDER BY id ASC`,
    [product.id]
  )
  product.productFigure = figureRes.rows

  const characteristicProduct = await db.query(
    `SELECT cp.*, ch.name as characteristic_name 
         FROM characteristic_product cp 
         LEFT JOIN characteristic ch ON cp.characteristic_id = ch.id 
         WHERE cp.product_id = $1 ORDER BY id ASC`,
    [product.id]
  )

  product.characteristicProduct = characteristicProduct.rows

  const brandProduct = await db.query(
    `SELECT bp.*, ch.name as brand_name 
         FROM brand_product bp 
         LEFT JOIN brands ch ON bp.brand_id = ch.id 
         WHERE bp.product_id = $1 ORDER BY id ASC`,
    [product.id]
  )

  product.brandProduct = brandProduct.rows

  // 4. Lấy các sản phẩm cùng danh mục (trừ chính nó)
  const sameCategoryRes = await db.query(
    `
    SELECT * FROM products
    WHERE category_id = $1 AND id != $2 AND active = true
    ORDER BY created_at DESC
    LIMIT 6
    `,
    [product.category_id, product.id]
  )
  product.sameCategoryProducts = sameCategoryRes.rows

  // 5. Lấy các sản phẩm cùng thương hiệu (trừ chính nó)
  const sameBrandRes = await db.query(
    `
    SELECT * FROM products
    WHERE brand_id = $1 AND id != $2 AND active = true
    ORDER BY created_at DESC
    LIMIT 6
    `,
    [product.brand_id, product.id]
  )
  const productKeyword = await db.query(
    `SELECT id, product_id, keyword FROM product_keyword WHERE product_id = $1 ORDER BY id ASC`,
    [product.id]
  )
  product.keyword = productKeyword.rows
  product.sameBrandProducts = sameBrandRes.rows

  return product
}

const getProductByIdPrivate = async id => {
  // 1. Truy vấn thông tin sản phẩm chính
  const productRes = await db.query(
    `
    SELECT p.*, c.name AS category_name, b.name AS brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.id = $1
    `,
    [id]
  )

  const product = productRes.rows[0]
  if (!product) return null

  // 2. Lấy ảnh sản phẩm
  const imageRes = await db.query(
    `SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY id ASC`,
    [id]
  )
  product.images = imageRes.rows.map(r => r.image_url)

  // 3. Lấy danh sách thông số kỹ thuật (figures)
  const figureRes = await db.query(
    `SELECT id, key, value FROM product_figures WHERE product_id = $1 ORDER BY id ASC`,
    [id]
  )
  product.productFigure = figureRes.rows

  const characteristicProduct = await db.query(
    `SELECT cp.*, ch.name as characteristic_name 
         FROM characteristic_product cp 
         LEFT JOIN characteristic ch ON cp.characteristic_id = ch.id 
         WHERE cp.product_id = $1 ORDER BY id ASC`,
    [id]
  )
  product.characteristicProduct = characteristicProduct.rows

  const brandProduct = await db.query(
    `SELECT bp.*, ch.name as brand_name 
         FROM brand_product bp 
         LEFT JOIN brands ch ON bp.brand_id = ch.id 
         WHERE bp.product_id = $1 ORDER BY id ASC`,
    [product.id]
  )

  product.brandProduct = brandProduct.rows

  const productKeyword = await db.query(
    `SELECT id, product_id, keyword FROM product_keyword WHERE product_id = $1 ORDER BY id ASC`,
    [id]
  )
  product.keyword = productKeyword.rows

  return product
}

const createProduct = async (
  data,
  imageUrls = [],
  productFigure = [],
  characteristic_product = [],
  brand_product = [],
  image = null
) => {
  const {
    name,
    description,
    short_description,
    price,
    price_sale,
    category_id,
    brand_id,
    active,
    index,
    slug,
    keyword
  } = data

  const existingIndex = await db.query(
    'SELECT id FROM products WHERE index = $1',
    [index]
  )

  if (existingIndex.rows.length > 0) {
    throw new AppError(`Số thứ tự ${index} đã tồn tại`, 400) // ✅ Giữ nguyên
  }

  // 1. Insert sản phẩm
  const result = await db.query(
    `INSERT INTO products (
      name, description, short_description,
      price, price_sale, category_id, brand_id, active, index, slug, image
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id`,
    [
      name,
      description,
      short_description,
      price,
      price_sale,
      category_id,
      brand_id,
      active,
      index,
      slug,
      image
    ]
  )

  const productId = result.rows[0].id

  // 2. Insert ảnh phụ
  for (const url of imageUrls) {
    await db.query(
      `INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`,
      [productId, url]
    )
  }

  // 3. Insert thông số kỹ thuật
  for (const figure of productFigure) {
    await db.query(
      `INSERT INTO product_figures (product_id, key, value) VALUES ($1, $2, $3)`,
      [productId, figure.key, figure.value]
    )
  }
  for (const type of characteristic_product) {
    await db.query(
      `INSERT INTO characteristic_product (product_id, characteristic_id) VALUES ($1, $2)`,
      [productId, type]
    )
  }

  for (const brand of brand_product) {
    await db.query(
      `INSERT INTO brand_product (product_id, brand_id) VALUES ($1, $2)`,
      [productId, brand]
    )
  }

  const keywordList = JSON.parse(keyword || '[]')
  for (const key of keywordList) {
    await db.query(
      `INSERT INTO product_keyword (product_id,keyword) VALUES ($1, $2)`,
      [productId, key]
    )
  }

  return { id: productId }
}

const updateProduct = async (
  id,
  data,
  newImageUrls = [],
  remainingImages = [],
  productFigure = [],
  characteristic_product = [],
  brand_product = [],
  image = null // ảnh chính (thumbnail)
) => {
  const {
    name,
    description,
    short_description,
    price,
    price_sale,
    category_id,
    brand_id,
    active,
    index,
    slug,
    keyword
  } = data || {}

  // ---------------------------------------------------------
  // 1. Kiểm tra sản phẩm tồn tại
  // ---------------------------------------------------------
  const checkExist = await db.query('SELECT id FROM products WHERE id = $1', [
    id
  ])
  if (checkExist.rows.length === 0) {
    throw new AppError('Không tìm thấy sản phẩm', 404)
  }

  // ---------------------------------------------------------
  // 2. Kiểm tra index trùng (nếu có)
  // ---------------------------------------------------------
  if (index !== undefined && index !== null) {
    const existingOrder = await db.query(
      'SELECT id FROM products WHERE index = $1 AND id != $2',
      [index, id]
    )
    if (existingOrder.rows.length > 0) {
      throw new AppError(`Số thứ tự ${index} đã tồn tại`, 400)
    }
  }

  // ---------------------------------------------------------
  // 3. Chuẩn hoá price_sale: null/undefined/'' -> 0
  // ---------------------------------------------------------
  const normalizedPriceSale =
    price_sale === null || price_sale === undefined || price_sale === ''
      ? 0
      : Number(price_sale)
  const safePriceSale = Number.isNaN(normalizedPriceSale)
    ? 0
    : normalizedPriceSale

  // ---------------------------------------------------------
  // 4. Build câu UPDATE động (chỉ set field !== undefined)
  // ---------------------------------------------------------
  const fields = []
  const params = []
  let paramIndex = 1

  const pushField = (column, value) => {
    fields.push(`${column} = $${paramIndex}`)
    params.push(value)
    paramIndex++
  }

  if (name !== undefined) pushField('name', name)
  if (description !== undefined) pushField('description', description)
  if (short_description !== undefined)
    pushField('short_description', short_description)
  if (price !== undefined) pushField('price', price)
  if (price_sale !== undefined) pushField('price_sale', safePriceSale)
  if (category_id !== undefined) pushField('category_id', category_id)
  if (brand_id !== undefined) pushField('brand_id', brand_id)
  if (active !== undefined) pushField('active', active)
  if (index !== undefined) pushField('index', index)
  if (slug !== undefined) pushField('slug', slug)
  if (image) pushField('image', image)

  if (fields.length === 0) {
    throw new AppError('Không có trường nào để cập nhật', 400)
  }

  params.push(id)
  const updateQuery = `
    UPDATE products
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `

  // ---------------------------------------------------------
  // 5. Parse keyword an toàn (array hoặc JSON string)
  // ---------------------------------------------------------
  let keywordList = []
  if (Array.isArray(keyword)) {
    keywordList = keyword
  } else if (typeof keyword === 'string' && keyword.trim() !== '') {
    try {
      const parsed = JSON.parse(keyword)
      if (Array.isArray(parsed)) keywordList = parsed
    } catch {
      keywordList = []
    }
  }

  // ---------------------------------------------------------
  // 6. Transaction
  // ---------------------------------------------------------
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // 6.1 Cập nhật bảng products
    const result = await client.query(updateQuery, params)

    // 6.2 Ảnh phụ
    //     - Nếu remainingImages được truyền dạng mảng -> xoá những ảnh cũ không còn
    //     - Nếu remainingImages là undefined/null -> giữ nguyên ảnh cũ
    if (Array.isArray(remainingImages)) {
      const oldImagesRes = await client.query(
        `SELECT image_url FROM product_images WHERE product_id = $1`,
        [id]
      )
      const oldImages = oldImagesRes.rows.map(r => r.image_url)
      const imagesToDelete = oldImages.filter(
        url => !remainingImages.includes(url)
      )
      for (const url of imagesToDelete) {
        await client.query(
          `DELETE FROM product_images WHERE product_id = $1 AND image_url = $2`,
          [id, url]
        )
      }
    }
    for (const url of newImageUrls) {
      await client.query(
        `INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`,
        [id, url]
      )
    }

    // 6.3 Thông số kỹ thuật
    await client.query(`DELETE FROM product_figures WHERE product_id = $1`, [
      id
    ])
    for (const figure of productFigure) {
      await client.query(
        `INSERT INTO product_figures (product_id, key, value) VALUES ($1, $2, $3)`,
        [id, figure.key, figure.value]
      )
    }

    // 6.4 Đặc tính
    await client.query(
      `DELETE FROM characteristic_product WHERE product_id = $1`,
      [id]
    )
    for (const type of characteristic_product) {
      await client.query(
        `INSERT INTO characteristic_product (product_id, characteristic_id) VALUES ($1, $2)`,
        [id, type]
      )
    }

    // 6.5 Thương hiệu liên kết
    await client.query(`DELETE FROM brand_product WHERE product_id = $1`, [id])
    for (const brand of brand_product) {
      await client.query(
        `INSERT INTO brand_product (product_id, brand_id) VALUES ($1, $2)`,
        [id, brand]
      )
    }

    // 6.6 Từ khoá
    await client.query(`DELETE FROM product_keyword WHERE product_id = $1`, [
      id
    ])
    for (const key of keywordList) {
      await client.query(
        `INSERT INTO product_keyword (product_id, keyword) VALUES ($1, $2)`,
        [id, key]
      )
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) throw error
    console.error('Lỗi khi cập nhật sản phẩm:', error)
    throw new AppError('Lỗi server khi cập nhật sản phẩm', 500)
  } finally {
    client.release()
  }
}

const updateProductIndex = async items => {
  try {
    // Validate dữ liệu trước
    for (const item of items) {
      const { id, index } = item

      if (!id || isNaN(parseInt(id))) {
        throw new AppError(`ID không hợp lệ: ${id}`, 400)
      }

      if (index === undefined || index === null || isNaN(parseInt(index))) {
        throw new AppError(`Thứ tự hiển thị không hợp lệ cho ID ${id}`, 400)
      }
    }

    // Lấy danh sách ID để kiểm tra tồn tại
    const ids = items.map(item => item.id)
    const checkExist = await db.query(
      'SELECT id FROM products WHERE id = ANY($1::int[])',
      [ids]
    )

    if (checkExist.rows.length !== ids.length) {
      const existingIds = checkExist.rows.map(row => row.id)
      const notFoundIds = ids.filter(id => !existingIds.includes(id))
      throw new AppError(
        `Không tìm thấy sản phẩm với ID: ${notFoundIds.join(', ')}`,
        404
      )
    }

    // Kiểm tra index không trùng nhau trong request
    const orders = items.map(item => item.index)
    const uniqueOrders = [...new Set(orders)]
    if (orders.length !== uniqueOrders.length) {
      throw new AppError(
        'Các thứ tự hiển thị không được trùng nhau trong request',
        400
      )
    }

    // Kiểm tra index không bị trùng với sản phẩm khác ngoài danh sách đang cập nhật
    const existingOrder = await db.query(
      'SELECT index FROM products WHERE index = ANY($1::int[]) AND id != ALL($2::int[])',
      [orders, ids]
    )

    if (existingOrder.rows.length > 0) {
      const duplicateOrders = existingOrder.rows.map(row => row.index)
      throw new AppError(
        `Các thứ tự hiển thị ${duplicateOrders.join(
          ', '
        )} đã tồn tại ở sản phẩm khác`,
        400
      )
    }

    // Xây dựng câu query CASE WHEN để cập nhật tất cả cùng lúc
    let caseWhen = ''
    let params = []
    let paramIndex = 1

    items.forEach((item, i) => {
      caseWhen += `WHEN id = $${paramIndex} THEN $${paramIndex + 1} `
      params.push(item.id, item.index)
      paramIndex += 2
    })

    const query = `
      UPDATE products 
      SET index = CASE 
        ${caseWhen}
        ELSE index 
      END
      WHERE id IN (${items.map((_, i) => `$${i * 2 + 1}`).join(', ')})
      RETURNING id, index, name
    `

    const result = await db.query(query, params)

    return {
      success: true,
      message: 'Cập nhật thứ tự hiển thị thành công',
      data: result.rows
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    console.error('Lỗi khi cập nhật thứ tự hiển thị hàng loạt:', error)
    throw new AppError('Lỗi server khi cập nhật thứ tự hiển thị', 500)
  }
}

const deleteProduct = async id => {
  await db.query(`DELETE FROM products WHERE id = $1`, [id])
}

module.exports = {
  getAllProducts,
  getAllProductsPrivate,
  getProductById,
  getProductByIdPrivate,
  createProduct,
  updateProduct,
  updateProductIndex,
  deleteProduct
}
