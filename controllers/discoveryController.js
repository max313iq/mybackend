const Product = require('../models/Product');
const Store = require('../models/Store');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

const parseSort = sort => {
  switch (sort) {
    case 'price-low':
      return 'price';
    case 'price-high':
      return '-price';
    case 'rating':
      return '-ratingsAverage';
    case 'popularity':
      return '-views';
    case 'best-seller':
      return '-soldCount';
    default:
      return '-createdAt';
  }
};

exports.searchProducts = catchAsync(async (req, res, next) => {
  const {
    search,
    category,
    store,
    minPrice,
    maxPrice,
    brand,
    rating,
    hasDiscount,
    inStock,
    freeDelivery,
    expressDelivery,
    sort = 'newest',
    page = 1,
    limit = 12
  } = req.query;

  const filter = { isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (rating) filter.ratingsAverage = { $gte: Number(rating) };
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (hasDiscount === 'true') filter.$expr = { $gt: ['$originalPrice', '$price'] };
  if (freeDelivery === 'true') filter['deliverySettings.customDeliveryPrice'] = 0;
  if (expressDelivery === 'true') filter['deliverySettings.expressDelivery.available'] = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (store) {
    const s = await Store.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(store) ? store : undefined },
        { slug: store }
      ].filter(Boolean)
    });
    if (s) filter.store = s._id;
  }
  if (req.params.storeId) filter.store = req.params.storeId;

  const skip = (Number(page) - 1) * Number(limit);
  const sortBy = parseSort(sort);

  const productsQuery = Product.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(Number(limit))
    .populate({
      path: 'store',
      select: 'name slug isVerified ratingsAverage'
    });

  const [products, total, categoryAgg, brandAgg] = await Promise.all([
    productsQuery,
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    Product.aggregate([
      { $match: filter },
      { $group: { _id: '$brand', count: { $sum: 1 } } }
    ])
  ]);

  const priceAgg = await Product.aggregate([
    { $match: filter },
    {
      $bucket: {
        groupBy: '$price',
        boundaries: [0, 100, 500, 1000, 3000, 10000],
        default: '10000+',
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  const formatPriceRange = (b, i, arr) => {
    if (b._id === '10000+') return { min: 10000, max: null, count: b.count };
    const min = Number(i === 0 ? 0 : arr[i - 1]._id);
    const max = Number(b._id);
    return { min, max, count: b.count };
  };

  res.status(200).json({
    success: true,
    data: products,
    filters: {
      categories: categoryAgg.map(c => ({ id: c._id, name: c._id, count: c.count })),
      brands: brandAgg.filter(b => b._id).map(b => ({ name: b._id, count: b.count })),
      priceRanges: priceAgg.map(formatPriceRange)
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

exports.searchStores = catchAsync(async (req, res, next) => {
  const {
    search,
    category,
    rating,
    verified,
    hasProducts,
    deliveryAreas,
    sort = 'newest',
    page = 1,
    limit = 12
  } = req.query;

  const filter = { isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) filter.category = category;
  if (rating) filter.ratingsAverage = { $gte: Number(rating) };
  if (verified === 'true') filter.isVerified = true;
  if (hasProducts === 'true') filter.productsCount = { $gt: 0 };
  if (deliveryAreas) filter['deliveryInfo.areas'] = deliveryAreas;

  const sortMap = {
    newest: '-createdAt',
    rating: '-ratingsAverage',
    popularity: '-followersCount',
    orders: '-productsCount'
  };
  const sortBy = sortMap[sort] || '-createdAt';
  const skip = (Number(page) - 1) * Number(limit);

  const storesQuery = Store.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(Number(limit));

  const [stores, total] = await Promise.all([
    storesQuery,
    Store.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: stores,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

exports.getCategories = catchAsync(async (req, res, next) => {
  const productAgg = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        productsCount: { $sum: 1 },
        averagePrice: { $avg: '$price' }
      }
    }
  ]);
  const storeAgg = await Store.aggregate([
    { $group: { _id: '$category', storesCount: { $sum: 1 } } }
  ]);
  const mapStore = {};
  storeAgg.forEach(s => {
    mapStore[s._id] = s.storesCount;
  });

  const data = productAgg.map(p => ({
    _id: p._id,
    name: p._id,
    productsCount: p.productsCount,
    storesCount: mapStore[p._id] || 0,
    averagePrice: Number(p.averagePrice?.toFixed(2) || 0)
  }));

  res.status(200).json({ success: true, data });
});

